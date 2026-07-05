import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import { writeFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { loadDemoEnv } from "./demo-env.mjs";

loadDemoEnv();

async function promptHidden(label) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(`${label} is required. Run in a TTY or set it in an ignored local env file.`);
  }

  return new Promise((resolve) => {
    let value = "";
    output.write(`${label}: `);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\u0003") {
          output.write("\n");
          input.setRawMode(false);
          input.pause();
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          output.write("\n");
          input.setRawMode(false);
          input.pause();
          input.off("data", onData);
          resolve(value.trim());
          return;
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    }

    input.on("data", onData);
  });
}

if (!process.env.BUYER_PRIVATE_KEY && process.argv.includes("--prompt-buyer-key")) {
  process.env.BUYER_PRIVATE_KEY = await promptHidden("BUYER_PRIVATE_KEY");
}

const contractAddress =
  process.env.BLINDPROCURE_ADDRESS ||
  process.env.NEXT_PUBLIC_BLINDPROCURE_ADDRESS ||
  "0x3801C32Fc2b61d9De992643825B80809Ac439443";
const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const requiredEnv = [
  "SEPOLIA_RPC_URL",
  "BUYER_PRIVATE_KEY",
  "SUPPLIER_A_PRIVATE_KEY",
  "SUPPLIER_B_PRIVATE_KEY",
  "SUPPLIER_C_PRIVATE_KEY",
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (!rpcUrl && !missing.includes("SEPOLIA_RPC_URL")) missing.push("SEPOLIA_RPC_URL");
if (missing.length > 0) {
  throw new Error(`Missing required local env vars: ${missing.join(", ")}`);
}

const abi = [
  {
    type: "function",
    name: "nextTenderId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tenders",
    stateMutability: "view",
    inputs: [{ name: "tenderId", type: "uint256" }],
    outputs: [
      { name: "buyer", type: "address" },
      { name: "title", type: "string" },
      { name: "specHash", type: "bytes32" },
      { name: "deadline", type: "uint64" },
      { name: "budgetCap", type: "uint64" },
      { name: "whitelistEnabled", type: "bool" },
      { name: "bidCount", type: "uint32" },
      { name: "finalized", type: "bool" },
      { name: "winnerRecorded", type: "bool" },
      { name: "winningSupplier", type: "address" },
    ],
  },
  {
    type: "function",
    name: "createTender",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "specHash", type: "bytes32" },
      { name: "deadline", type: "uint64" },
      { name: "budgetCap", type: "uint64" },
      { name: "whitelistEnabled", type: "bool" },
    ],
    outputs: [{ name: "tenderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "approveSuppliers",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "suppliers", type: "address[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitBid",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "encryptedPrice", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [{ name: "bidId", type: "uint32" }],
  },
  {
    type: "function",
    name: "finalizeTender",
    stateMutability: "nonpayable",
    inputs: [{ name: "tenderId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "recordWinnerFromProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "abiEncodedClearWinnerBidId", type: "bytes" },
      { name: "decryptionProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "grantAuditorAccess",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "auditor", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "winningBidHandle",
    stateMutability: "view",
    inputs: [{ name: "tenderId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "winningBidIdHandle",
    stateMutability: "view",
    inputs: [{ name: "tenderId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

function accountFromEnv(key) {
  return privateKeyToAccount(process.env[key]);
}

function walletClient(account) {
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

async function wait(hash, label) {
  console.log(`${label}: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function maybeFundSuppliers(buyerWallet, suppliers) {
  if (process.env.FUND_SUPPLIERS !== "true") return;

  for (const supplier of suppliers) {
    const balance = await publicClient.getBalance({ address: supplier.address });
    if (balance >= parseEther("0.005")) continue;
    const hash = await buyerWallet.sendTransaction({
      to: supplier.address,
      value: parseEther("0.01"),
    });
    await wait(hash, `Funded supplier ${supplier.address}`);
  }
}

async function finalizeWithRetry(buyerWallet, tenderId) {
  const maxAttempts = Number(process.env.DEMO_FINALIZE_ATTEMPTS || "12");
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const finalizeHash = await buyerWallet.writeContract({
        address: contractAddress,
        abi,
        functionName: "finalizeTender",
        args: [tenderId],
      });
      await wait(finalizeHash, "Finalized encrypted selection");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("0x3c9f9aa6") || attempt === maxAttempts) {
        throw error;
      }
      console.log(`Tender still open at finalize attempt ${attempt}; waiting 20s...`);
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
  }
}

async function main() {
  const buyer = accountFromEnv("BUYER_PRIVATE_KEY");
  const supplierA = accountFromEnv("SUPPLIER_A_PRIVATE_KEY");
  const supplierB = accountFromEnv("SUPPLIER_B_PRIVATE_KEY");
  const supplierC = accountFromEnv("SUPPLIER_C_PRIVATE_KEY");
  const auditor = process.env.AUDITOR_PRIVATE_KEY ? accountFromEnv("AUDITOR_PRIVATE_KEY") : null;

  const buyerWallet = walletClient(buyer);
  const supplierWallets = [supplierA, supplierB, supplierC].map(walletClient);
  const supplierAddresses = [supplierA.address, supplierB.address, supplierC.address];

  await maybeFundSuppliers(buyerWallet, [supplierA, supplierB, supplierC]);

  const relayer = new RelayerNode({
    getChainId: async () => sepolia.id,
    poolSize: 2,
    transports: {
      [sepolia.id]: {
        ...SepoliaConfig,
        network: rpcUrl,
      },
    },
  });

  try {
    const resumeTenderId = process.env.DEMO_RESUME_TENDER_ID ? BigInt(process.env.DEMO_RESUME_TENDER_ID) : null;
    let tenderId;

    if (resumeTenderId) {
      tenderId = resumeTenderId;
      console.log(`Resuming tender ID: ${tenderId}`);
    } else {
      const nextTenderId = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "nextTenderId",
      });
      const deadlineSeconds = Number(process.env.DEMO_DEADLINE_SECONDS || "600");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
      const spec =
        "Office laptops Q3: 30 developer laptops, 32GB RAM, three-year support, delivery before procurement close.";
      const specHash = keccak256(toHex(spec));

      const createHash = await buyerWallet.writeContract({
        address: contractAddress,
        abi,
        functionName: "createTender",
        args: ["Office laptops Q3", specHash, deadline, 1500n, true],
      });
      await wait(createHash, "Created tender");

      tenderId = nextTenderId;
    }

    console.log(`Tender ID: ${tenderId}`);
    console.log(`Buyer: ${buyer.address}`);
    console.log(`Supplier A: ${supplierA.address}`);
    console.log(`Supplier B: ${supplierB.address}`);
    console.log(`Supplier C: ${supplierC.address}`);

    if (!resumeTenderId) {
      const approveHash = await buyerWallet.writeContract({
        address: contractAddress,
        abi,
        functionName: "approveSuppliers",
        args: [tenderId, supplierAddresses],
      });
      await wait(approveHash, "Approved suppliers");

      const bidInputs = [
        { wallet: supplierWallets[0], address: supplierA.address, price: 1200n, label: "Supplier A" },
        { wallet: supplierWallets[1], address: supplierB.address, price: 980n, label: "Supplier B" },
        { wallet: supplierWallets[2], address: supplierC.address, price: 1100n, label: "Supplier C" },
      ];

      for (const bid of bidInputs) {
        const encrypted = await relayer.encrypt({
          contractAddress,
          userAddress: bid.address,
          values: [{ type: "euint64", value: bid.price }],
        });
        const hash = await bid.wallet.writeContract({
          address: contractAddress,
          abi,
          functionName: "submitBid",
          args: [tenderId, toHex(encrypted.handles[0], { size: 32 }), toHex(encrypted.inputProof)],
        });
        await wait(hash, `${bid.label} submitted encrypted bid`);
      }

      const now = Math.floor(Date.now() / 1000);
      const waitMs = Math.max(0, Number(deadline) - now + 4) * 1000;
      if (waitMs > 0) {
        console.log(`Waiting ${Math.ceil(waitMs / 1000)}s for the tender deadline...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }

    await finalizeWithRetry(buyerWallet, tenderId);

    const winnerIdHandle = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "winningBidIdHandle",
      args: [tenderId],
    });
    const publicDecrypt = await relayer.publicDecrypt([winnerIdHandle]);
    const winnerBidId = publicDecrypt.clearValues[winnerIdHandle];
    const recordHash = await buyerWallet.writeContract({
      address: contractAddress,
      abi,
      functionName: "recordWinnerFromProof",
      args: [tenderId, publicDecrypt.abiEncodedClearValues, publicDecrypt.decryptionProof],
    });
    await wait(recordHash, "Recorded proof-verified winner");

    const winningBidHandle = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "winningBidHandle",
      args: [tenderId],
    });
    const keypair = await relayer.generateKeypair();
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 7;
    const typedData = await relayer.createEIP712(
      keypair.publicKey,
      [contractAddress],
      startTimestamp,
      durationDays,
    );
    const signature = await buyer.signTypedData({
      ...typedData,
      primaryType: typedData.primaryType || "UserDecryptRequestVerification",
    });
    const decryptResult = await relayer.userDecrypt({
      handles: [winningBidHandle],
      contractAddress,
      signedContractAddresses: [contractAddress],
      privateKey: keypair.privateKey,
      publicKey: keypair.publicKey,
      signature,
      signerAddress: buyer.address,
      startTimestamp,
      durationDays,
    });

    const tender = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "tenders",
      args: [tenderId],
    });

    assert(String(winnerBidId) === "2", `Expected winning bid ID 2, got ${winnerBidId}.`);
    assert(
      tender[9].toLowerCase() === supplierB.address.toLowerCase(),
      `Expected Supplier B to win, got ${tender[9]}.`,
    );
    assert(
      String(decryptResult[winningBidHandle]) === "980",
      `Expected buyer decrypted winning price 980, got ${decryptResult[winningBidHandle]}.`,
    );

    console.log(`Winning bid ID: ${winnerBidId}`);
    console.log(`Winning supplier: ${tender[9]}`);
    console.log(`Buyer decrypted winning price: ${decryptResult[winningBidHandle]}`);

    if (auditor) {
      const grantHash = await buyerWallet.writeContract({
        address: contractAddress,
        abi,
        functionName: "grantAuditorAccess",
        args: [tenderId, auditor.address],
      });
      await wait(grantHash, `Granted auditor access to ${auditor.address}`);

      const auditorKeypair = await relayer.generateKeypair();
      const auditorTypedData = await relayer.createEIP712(
        auditorKeypair.publicKey,
        [contractAddress],
        startTimestamp,
        durationDays,
      );
      const auditorSignature = await auditor.signTypedData({
        ...auditorTypedData,
        primaryType: auditorTypedData.primaryType || "UserDecryptRequestVerification",
      });
      const auditorDecrypt = await relayer.userDecrypt({
        handles: [winningBidHandle],
        contractAddress,
        signedContractAddresses: [contractAddress],
        privateKey: auditorKeypair.privateKey,
        publicKey: auditorKeypair.publicKey,
        signature: auditorSignature,
        signerAddress: auditor.address,
        startTimestamp,
        durationDays,
      });
      assert(
        String(auditorDecrypt[winningBidHandle]) === "980",
        `Expected auditor decrypted winning price 980, got ${auditorDecrypt[winningBidHandle]}.`,
      );
      console.log(`Auditor decrypted winning price: ${auditorDecrypt[winningBidHandle]}`);
    }

    const resultPath = new URL("../.env.demo-result", import.meta.url);
    const resultLines = [
      "# Public demo result generated by seed-demo.mjs.",
      "DEMO_SEEDED=true",
      `TENDER_ID=${tenderId}`,
      `BUYER_ADDRESS=${buyer.address}`,
      `SUPPLIER_A_ADDRESS=${supplierA.address}`,
      `SUPPLIER_B_ADDRESS=${supplierB.address}`,
      `SUPPLIER_C_ADDRESS=${supplierC.address}`,
      auditor ? `AUDITOR_ADDRESS=${auditor.address}` : "AUDITOR_ADDRESS=",
      `EXPECTED_WINNER_BID_ID=${winnerBidId}`,
      `EXPECTED_WINNER_ADDRESS=${supplierB.address}`,
      "EXPECTED_WINNING_PRICE=980",
      `RECORDED_WINNER_ADDRESS=${tender[9]}`,
      `DEMO_URL=https://blindprocure.vercel.app/tenders/${tenderId}`,
      "",
    ];
    writeFileSync(resultPath, resultLines.join("\n"), { mode: 0o600 });

    console.log(`Demo URL: https://blindprocure.vercel.app/tenders/${tenderId}`);
    console.log("Wrote public demo result to web/.env.demo-result");
  } finally {
    relayer.terminate();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
