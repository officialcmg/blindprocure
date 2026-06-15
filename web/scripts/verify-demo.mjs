import { createPublicClient, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { loadDemoEnv } from "./demo-env.mjs";

loadDemoEnv();

const contractAddress =
  process.env.BLINDPROCURE_ADDRESS ||
  process.env.NEXT_PUBLIC_BLINDPROCURE_ADDRESS ||
  "0x3801C32Fc2b61d9De992643825B80809Ac439443";
const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

const requiredEnv = ["SEPOLIA_RPC_URL", "TENDER_ID", "EXPECTED_WINNER_ADDRESS"];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (!rpcUrl && !missing.includes("SEPOLIA_RPC_URL")) missing.push("SEPOLIA_RPC_URL");
if (missing.length > 0) {
  throw new Error(`Missing required local env vars: ${missing.join(", ")}. Run seed:demo first.`);
}

if (!isAddress(process.env.EXPECTED_WINNER_ADDRESS)) {
  throw new Error("EXPECTED_WINNER_ADDRESS is not a valid address.");
}

const tenderId = BigInt(process.env.TENDER_ID);
const expectedWinner = process.env.EXPECTED_WINNER_ADDRESS.toLowerCase();
const expectedWinnerBidId = process.env.EXPECTED_WINNER_BID_ID || "2";
const expectedWinningPrice = process.env.EXPECTED_WINNING_PRICE || "980";

if (expectedWinnerBidId !== "2") {
  throw new Error(`Expected winner bid ID metadata should be 2, got ${expectedWinnerBidId}.`);
}

if (expectedWinningPrice !== "980") {
  throw new Error(`Expected winning price metadata should be 980, got ${expectedWinningPrice}.`);
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
    name: "getBidSupplier",
    stateMutability: "view",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "bidId", type: "uint32" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nextTenderId = await publicClient.readContract({
  address: contractAddress,
  abi,
  functionName: "nextTenderId",
});
assert(tenderId > 0n && tenderId < nextTenderId, `Tender ${tenderId} does not exist.`);

const tender = await publicClient.readContract({
  address: contractAddress,
  abi,
  functionName: "tenders",
  args: [tenderId],
});

assert(tender[1] === "Office laptops Q3", `Unexpected title: ${tender[1]}`);
assert(tender[4] === 1500n, `Unexpected budget cap: ${tender[4]}`);
assert(tender[6] === 3, `Unexpected bid count: ${tender[6]}`);
assert(tender[7] === true, "Tender is not finalized.");
assert(tender[8] === true, "Winner has not been recorded.");
assert(tender[9].toLowerCase() === expectedWinner, `Unexpected winner: ${tender[9]}`);

const suppliers = await Promise.all(
  [1, 2, 3].map((bidId) =>
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "getBidSupplier",
      args: [tenderId, bidId],
    }),
  ),
);

assert(suppliers[1].toLowerCase() === expectedWinner, "Bid #2 is not the expected Supplier B address.");

console.log("Demo verification passed.");
console.log(`Tender ID: ${tenderId}`);
console.log(`Title: ${tender[1]}`);
console.log(`Bid count: ${tender[6]}`);
console.log(`Winning supplier: ${tender[9]}`);
console.log(`Demo URL: https://blindprocure.vercel.app/tenders/${tenderId}`);
