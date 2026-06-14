import type { Address } from "viem";

export const blindProcureAddress = (process.env.NEXT_PUBLIC_BLINDPROCURE_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

export const sepoliaExplorerBaseUrl = "https://sepolia.etherscan.io";

export const blindProcureAbi = [
  {
    type: "function",
    name: "MAX_BIDS_PER_TENDER",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint32" }],
  },
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
    name: "approved",
    stateMutability: "view",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "supplier", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasBid",
    stateMutability: "view",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "supplier", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
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
    name: "approveSupplier",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tenderId", type: "uint256" },
      { name: "supplier", type: "address" },
    ],
    outputs: [],
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
] as const;

export const isContractConfigured =
  blindProcureAddress !== "0x0000000000000000000000000000000000000000";
