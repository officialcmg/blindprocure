"use client";

import {
  RelayerWeb,
  SepoliaConfig,
  indexedDBStorage,
  type Handle,
  type Hex,
} from "@zama-fhe/sdk";
import type { Address } from "viem";
import { sepolia } from "wagmi/chains";

let relayer: RelayerWeb | null = null;

export function initZamaClient(getChainId: () => Promise<number>) {
  if (!relayer) {
    relayer = new RelayerWeb({
      transports: {
        [sepolia.id]: SepoliaConfig,
      },
      getChainId,
      fheArtifactStorage: indexedDBStorage,
    });
  }

  return relayer;
}

export async function encryptBidPrice({
  contractAddress,
  account,
  price,
  getChainId,
}: {
  contractAddress: Address;
  account: Address;
  price: bigint;
  getChainId: () => Promise<number>;
}) {
  const client = initZamaClient(getChainId);
  return client.encrypt({
    contractAddress,
    userAddress: account,
    values: [{ type: "euint64", value: price }],
  });
}

export async function publicDecryptWinnerId({
  handle,
  getChainId,
}: {
  handle: Handle;
  getChainId: () => Promise<number>;
}) {
  const client = initZamaClient(getChainId);
  return client.publicDecrypt([handle]);
}

export async function decryptWinningPrice({
  contractAddress,
  handle,
  account,
  signTypedData,
  getChainId,
}: {
  contractAddress: Address;
  handle: Handle;
  account: Address;
  signTypedData: (typedData: {
    domain: Record<string, unknown>;
    types: Record<string, readonly { name: string; type: string }[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  }) => Promise<Hex>;
  getChainId: () => Promise<number>;
}) {
  const client = initZamaClient(getChainId);
  const keypair = await client.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 7;
  const typedData = await client.createEIP712(keypair.publicKey, [contractAddress], startTimestamp, durationDays);
  const signature = await signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });

  const result = await client.userDecrypt({
    handles: [handle],
    contractAddress,
    signedContractAddresses: [contractAddress],
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    signature,
    signerAddress: account,
    startTimestamp,
    durationDays,
  });

  return result[handle];
}
