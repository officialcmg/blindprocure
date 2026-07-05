"use client";

import {
  ZamaSDK,
  createConfig,
  indexedDBStorage,
  sepolia as zamaSepolia,
} from "@zama-fhe/sdk";
import { web } from "@zama-fhe/sdk/web";
import { toHex, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

let sdk: ZamaSDK | null = null;

export const zamaAclAddress = zamaSepolia.aclContractAddress as Address;

export function initZamaClient(getChainId: () => Promise<number>) {
  if (!sdk) {
    sdk = new ZamaSDK(
      createConfig({
        chains: [zamaSepolia],
        relayers: {
          [sepolia.id]: web({ fheArtifactStorage: indexedDBStorage }),
        },
        provider: {
          getChainId,
          readContract: async () => {
            throw new Error("BlindProcure does not use Zama SDK contract reads.");
          },
          waitForTransactionReceipt: async () => {
            throw new Error("BlindProcure waits for transactions through viem.");
          },
          getBlockTimestamp: async () => BigInt(Math.floor(Date.now() / 1000)),
        },
        storage: indexedDBStorage,
      }),
    );
  }

  return sdk.relayer;
}

function requireEncryptedValue(value: Hex | undefined) {
  if (!value) {
    throw new Error("Zama encryption did not return an encrypted value.");
  }

  return value;
}

function requireClearValue(result: Readonly<Record<Hex, unknown>>, handle: Hex) {
  const value = result[handle];
  if (typeof value === "undefined") {
    throw new Error("Zama decryption did not return the requested handle.");
  }

  return value;
}

export function encryptedBidValue(encrypted: { encryptedValues?: readonly Hex[]; handles?: readonly Hex[] }) {
  return requireEncryptedValue(encrypted.encryptedValues?.[0] ?? encrypted.handles?.[0]);
}

export function encryptedInputProof(encrypted: { inputProof: Hex | Uint8Array }) {
  return typeof encrypted.inputProof === "string" ? encrypted.inputProof : toHex(encrypted.inputProof);
}

export type ZamaHandle = Hex;

export async function encryptBidPriceDirect({
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
  if (typeof window === "undefined" || window.crossOriginIsolated) {
    return encryptBidPriceDirect({ contractAddress, account, price, getChainId });
  }

  return encryptBidPriceInIsolatedWindow({ contractAddress, account, price });
}

function encryptBidPriceInIsolatedWindow({
  contractAddress,
  account,
  price,
}: {
  contractAddress: Address;
  account: Address;
  price: bigint;
}) {
  return new Promise<{ encryptedValues?: readonly Hex[]; handles?: readonly Hex[]; inputProof: Hex }>(
    (resolve, reject) => {
      const channelName = `blindprocure-encrypt-${crypto.randomUUID()}`;
      const channel = new BroadcastChannel(channelName);
      const timeout = window.setTimeout(() => {
        channel.close();
        reject(new Error("Encrypted bid helper timed out."));
      }, 180_000);

      channel.onmessage = (event: MessageEvent) => {
        const message = event.data as
          | { type: "ready" }
          | {
              type: "result";
              encryptedValues?: readonly Hex[];
              handles?: readonly Hex[];
              inputProof: Hex;
            }
          | { type: "error"; message: string };

        if (message.type === "ready") {
          channel.postMessage({
            type: "encrypt",
            contractAddress,
            account,
            price: price.toString(),
          });
          return;
        }

        window.clearTimeout(timeout);
        channel.close();
        document.getElementById("blindprocure-encryption-helper")?.remove();

        if (message.type === "error") {
          reject(new Error(message.message));
          return;
        }

        resolve({
          encryptedValues: message.encryptedValues,
          handles: message.handles,
          inputProof: message.inputProof,
        });
      };

      const helperUrl = `/encrypt-bid?channel=${encodeURIComponent(channelName)}`;
      const helper = window.open(helperUrl, "_blank", "popup,width=480,height=360");
      if (!helper) {
        showEncryptionHelperLink(helperUrl, () => {
          window.clearTimeout(timeout);
          channel.close();
          reject(new Error("Encrypted bid helper was cancelled."));
        });
      }
    },
  );
}

function showEncryptionHelperLink(helperUrl: string, onCancel: () => void) {
  document.getElementById("blindprocure-encryption-helper")?.remove();

  const container = document.createElement("div");
  container.id = "blindprocure-encryption-helper";
  container.style.position = "fixed";
  container.style.inset = "auto 16px 16px auto";
  container.style.zIndex = "2147483647";
  container.style.display = "grid";
  container.style.gap = "8px";
  container.style.maxWidth = "320px";
  container.style.border = "1px solid #d8d0c0";
  container.style.background = "#fff";
  container.style.padding = "12px";
  container.style.boxShadow = "0 12px 30px rgba(23, 23, 20, 0.18)";

  const text = document.createElement("div");
  text.textContent = "Open the local encryption helper to finish encrypting this bid.";
  text.style.font = "14px system-ui, sans-serif";
  text.style.color = "#171714";

  const link = document.createElement("a");
  link.href = helperUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Open encryption helper";
  link.style.display = "inline-flex";
  link.style.justifyContent = "center";
  link.style.background = "#147d74";
  link.style.color = "#fff";
  link.style.padding = "8px 10px";
  link.style.textDecoration = "none";
  link.style.font = "600 14px system-ui, sans-serif";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.style.border = "1px solid #d8d0c0";
  cancel.style.background = "#fff";
  cancel.style.padding = "8px 10px";
  cancel.style.font = "14px system-ui, sans-serif";
  cancel.onclick = () => {
    container.remove();
    onCancel();
  };

  container.append(text, link, cancel);
  document.body.append(container);
}

export async function publicDecryptWinnerId({
  handle,
  getChainId,
}: {
  handle: ZamaHandle;
  getChainId: () => Promise<number>;
}) {
  const client = initZamaClient(getChainId);
  return client.publicDecrypt([handle]);
}

export async function decryptWinningPriceAsDelegate({
  contractAddress,
  handle,
  delegatorAddress,
  delegateAddress,
  signTypedData,
  getChainId,
}: {
  contractAddress: Address;
  handle: ZamaHandle;
  delegatorAddress: Address;
  delegateAddress: Address;
  signTypedData: (typedData: {
    domain: Record<string, unknown>;
    types: Record<string, readonly { name: string; type: string }[]>;
    primaryType?: string;
    message: Record<string, unknown>;
  }) => Promise<Hex>;
  getChainId: () => Promise<number>;
}) {
  const client = initZamaClient(getChainId);
  const keypair = await client.generateTransportKeyPair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const typedData = await client.createDelegatedUserDecryptEIP712(
    keypair.publicKey,
    [contractAddress],
    delegatorAddress,
    startTimestamp,
    durationDays,
  );
  const signature = await signTypedData({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });

  const result = await client.delegatedUserDecrypt({
    encryptedValues: [handle],
    contractAddress,
    signedContractAddresses: [contractAddress],
    privateKey: keypair.privateKey,
    publicKey: keypair.publicKey,
    signature,
    delegatorAddress,
    delegateAddress,
    startTimestamp,
    durationDays,
  });

  return requireClearValue(result, handle);
}
