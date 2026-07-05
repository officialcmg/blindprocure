"use client";

import { useEffect, useState } from "react";
import type { Address, Hex } from "viem";
import { sepolia } from "viem/chains";
import {
  encryptBidPriceDirect,
  encryptedBidValue,
  encryptedInputProof,
} from "@/lib/zama";

type EncryptRequest = {
  type: "encrypt";
  contractAddress: Address;
  account: Address;
  price: string;
};

export default function EncryptBidPage() {
  const [status, setStatus] = useState("Preparing encrypted bid helper...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channelName = params.get("channel");
    if (!channelName) {
      return;
    }

    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: "ready" });

    channel.onmessage = async (event: MessageEvent<EncryptRequest>) => {
      if (event.data?.type !== "encrypt") return;

      try {
        setStatus("Encrypting bid locally...");
        const encrypted = await encryptBidPriceDirect({
          contractAddress: event.data.contractAddress,
          account: event.data.account,
          price: BigInt(event.data.price),
          getChainId: async () => sepolia.id,
        });

        channel.postMessage({
          type: "result",
          encryptedValues: [encryptedBidValue(encrypted) as Hex],
          inputProof: encryptedInputProof(encrypted),
        });
        setStatus("Encrypted bid ready.");
        window.setTimeout(() => window.close(), 500);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Bid encryption failed.";
        channel.postMessage({ type: "error", message });
        setStatus(message);
      }
    };

    return () => channel.close();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f2ea] px-6 text-[#1b1813]">
      <section className="w-full max-w-md rounded-lg border border-[#ddd3bf] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#115e59]">BlindProcure</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Local bid encryption</h1>
        <p className="mt-3 flex items-center gap-2.5 text-sm leading-6 text-[#6c675c]" role="status" aria-live="polite">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#ddd3bf] border-t-[#0f766e]"
          />
          {status}
        </p>
        <p className="mt-4 border-t border-[#ddd3bf] pt-3 text-xs leading-5 text-[#6c675c]">
          This window encrypts your bid price on your device using Zama FHE, then closes itself. Your
          plaintext price never leaves this browser.
        </p>
      </section>
    </main>
  );
}
