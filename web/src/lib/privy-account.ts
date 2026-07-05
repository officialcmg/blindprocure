"use client";

import {
  getEmbeddedConnectedWallet,
  usePrivy,
  useSignTypedData,
  useWallets,
} from "@privy-io/react-auth";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { useCallback, useMemo } from "react";
import { sepolia } from "viem/chains";
import type { Address, Hex } from "viem";

function serializeBigInts(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeBigInts);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeBigInts(nestedValue)]),
    );
  }
  return value;
}

export function usePrivyAccount() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const { client, getClientForChain } = useSmartWallets();
  const { signTypedData } = useSignTypedData();
  const embeddedWallet = useMemo(() => getEmbeddedConnectedWallet(wallets), [wallets]);
  const smartAccountAddress = client?.account.address as Address | undefined;

  const sendCall = useCallback(
    async ({
      to,
      data,
      description,
    }: {
      to: Address;
      data: Hex;
      description: string;
    }) => {
      const smartClient =
        client?.chain.id === sepolia.id ? client : await getClientForChain({ id: sepolia.id });
      if (!smartClient) throw new Error("Your sponsored account is still being prepared. Try again shortly.");

      return smartClient.sendTransaction(
        { calls: [{ to, data, value: 0n }] },
        { uiOptions: { showWalletUIs: false, description } },
      );
    },
    [client, getClientForChain],
  );

  const signAsEmbeddedWallet = useCallback(
    async (typedData: Parameters<typeof signTypedData>[0]) => {
      if (!embeddedWallet) throw new Error("Your private signer is still being prepared.");
      const serializableTypedData = serializeBigInts(typedData) as Parameters<typeof signTypedData>[0];
      const result = await signTypedData(serializableTypedData, {
        address: embeddedWallet.address,
        uiOptions: { showWalletUIs: false },
      });
      return result.signature as Hex;
    },
    [embeddedWallet, signTypedData],
  );

  return {
    ready: ready && walletsReady,
    authenticated,
    accountReady: Boolean(authenticated && embeddedWallet && smartAccountAddress),
    user,
    login,
    logout,
    embeddedWalletAddress: embeddedWallet?.address as Address | undefined,
    smartAccountAddress,
    sendCall,
    signAsEmbeddedWallet,
  };
}
