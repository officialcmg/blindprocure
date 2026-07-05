import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import { readFile } from "node:fs/promises";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { loadDemoEnv } from "./demo-env.mjs";

loadDemoEnv();

const blindProcureAddress =
  process.env.BLINDPROCURE_ADDRESS ||
  process.env.NEXT_PUBLIC_BLINDPROCURE_ADDRESS ||
  "0x3801C32Fc2b61d9De992643825B80809Ac439443";
const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
const testPrivateKey = process.env.SMART_ACCOUNT_TEST_PRIVATE_KEY || process.env.SUPPLIER_A_PRIVATE_KEY;

if (!rpcUrl || !testPrivateKey) {
  throw new Error(
    "Set SEPOLIA_RPC_URL and SMART_ACCOUNT_TEST_PRIVATE_KEY (or SUPPLIER_A_PRIVATE_KEY) in an ignored local env file.",
  );
}

const blindProcureAbi = [
  {
    type: "function",
    name: "nextTenderId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "createTender",
    stateMutability: "nonpayable",
    inputs: [
      { type: "string" },
      { type: "bytes32" },
      { type: "uint64" },
      { type: "uint64" },
      { type: "bool" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "submitBid",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }, { type: "bytes32" }, { type: "bytes" }],
    outputs: [{ type: "uint32" }],
  },
  {
    type: "function",
    name: "finalizeTender",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "winningBidHandle",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
];

const accountAbi = [
  {
    type: "constructor",
    inputs: [{ name: "accountOwner", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "result", type: "bytes" }],
  },
];

const aclAbi = [
  {
    type: "function",
    name: "delegateForUserDecryption",
    stateMutability: "nonpayable",
    inputs: [
      { name: "delegate", type: "address" },
      { name: "contractAddress", type: "address" },
      { name: "expirationDate", type: "uint64" },
    ],
    outputs: [],
  },
];

const owner = privateKeyToAccount(testPrivateKey);
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account: owner, chain: sepolia, transport: http(rpcUrl) });

async function wait(hash, label) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  console.log(`${label}: ${hash}`);
  return receipt;
}

async function executeFromSmartAccount(smartAccount, target, data, label) {
  const hash = await walletClient.writeContract({
    address: smartAccount,
    abi: accountAbi,
    functionName: "execute",
    args: [target, data],
  });
  return wait(hash, label);
}

async function finalizeFromSmartAccount(smartAccount, tenderId) {
  const finalizeData = encodeFunctionData({
    abi: blindProcureAbi,
    functionName: "finalizeTender",
    args: [tenderId],
  });

  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      return await executeFromSmartAccount(
        smartAccount,
        blindProcureAddress,
        finalizeData,
        "Finalized as contract-account buyer",
      );
    } catch (error) {
      lastError = error;
      if (attempt === 12) break;
      console.log(`Tender is not closed in the latest Sepolia block (${attempt}/12); retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }

  throw lastError;
}

async function main() {
  const artifactUrl = new URL(
    "../../contracts/artifacts/contracts/test/DelegatingSmartAccount.sol/DelegatingSmartAccount.json",
    import.meta.url,
  );
  const artifact = JSON.parse(await readFile(artifactUrl, "utf8"));
  const balance = await publicClient.getBalance({ address: owner.address });
  if (balance === 0n) throw new Error("The smart-account test owner has no Sepolia ETH.");

  console.log(`Test owner: ${owner.address}`);
  const deploymentHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [owner.address],
  });
  const deployment = await wait(deploymentHash, "Deployed contract-account harness");
  if (!deployment.contractAddress) throw new Error("Smart-account deployment did not return an address.");
  const smartAccount = deployment.contractAddress;
  console.log(`Contract account: ${smartAccount}`);

  const tenderId = await publicClient.readContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "nextTenderId",
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 45);
  const createData = encodeFunctionData({
    abi: blindProcureAbi,
    functionName: "createTender",
    args: [
      "Smart-account decryption compatibility test",
      keccak256(toHex("Isolated Zama delegated user-decryption test")),
      deadline,
      1500n,
      false,
    ],
  });
  await executeFromSmartAccount(smartAccount, blindProcureAddress, createData, `Created tender #${tenderId}`);

  const relayer = new RelayerNode({
    getChainId: async () => sepolia.id,
    poolSize: 2,
    transports: {
      [sepolia.id]: { ...SepoliaConfig, network: rpcUrl },
    },
  });

  try {
    const encrypted = await relayer.encrypt({
      contractAddress: blindProcureAddress,
      userAddress: owner.address,
      values: [{ type: "euint64", value: 980n }],
    });
    const bidHash = await walletClient.writeContract({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "submitBid",
      args: [tenderId, toHex(encrypted.handles[0], { size: 32 }), toHex(encrypted.inputProof)],
    });
    await wait(bidHash, "Submitted encrypted bid from owner EOA");

    const remainingMs = Math.max(0, Number(deadline) * 1000 - Date.now() + 4_000);
    if (remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, remainingMs));

    await finalizeFromSmartAccount(smartAccount, tenderId);

    const handle = await publicClient.readContract({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "winningBidHandle",
      args: [tenderId],
    });

    const expiration = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const delegationData = encodeFunctionData({
      abi: aclAbi,
      functionName: "delegateForUserDecryption",
      args: [owner.address, blindProcureAddress, expiration],
    });
    await executeFromSmartAccount(
      smartAccount,
      SepoliaConfig.aclContractAddress,
      delegationData,
      "Delegated Zama user decryption to owner EOA",
    );

    const keypair = await relayer.generateKeypair();
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 1;
    const typedData = await relayer.createDelegatedUserDecryptEIP712(
      keypair.publicKey,
      [blindProcureAddress],
      smartAccount,
      startTimestamp,
      durationDays,
    );
    const signature = await owner.signTypedData({
      ...typedData,
      primaryType: typedData.primaryType || "DelegatedUserDecryptRequestVerification",
    });

    let decrypted;
    let lastError;
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      try {
        decrypted = await relayer.delegatedUserDecrypt({
          handles: [handle],
          contractAddress: blindProcureAddress,
          signedContractAddresses: [blindProcureAddress],
          privateKey: keypair.privateKey,
          publicKey: keypair.publicKey,
          signature,
          delegatorAddress: smartAccount,
          delegateAddress: owner.address,
          startTimestamp,
          durationDays,
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 12) break;
        console.log(`Waiting for Zama ACL propagation (${attempt}/12)...`);
        await new Promise((resolve) => setTimeout(resolve, 15_000));
      }
    }

    if (!decrypted) throw lastError || new Error("Delegated decryption did not return a result.");
    if (String(decrypted[handle]) !== "980") {
      throw new Error(`Expected delegated decryption result 980, got ${decrypted[handle]}.`);
    }

    console.log(`Delegated winning-price decryption: ${decrypted[handle]}`);
    console.log("PASS: Zama user decryption works when the ACL principal is a contract account and its EOA owner is delegated.");
  } finally {
    relayer.terminate();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
