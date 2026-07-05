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
    <main className="grid min-h-screen place-items-center bg-[#f5f2eb] px-6 text-[#171714]">
      <section className="w-full max-w-md border border-[#d8d0c0] bg-white p-6">
        <p className="text-xs uppercase text-[#147d74]">BlindProcure</p>
        <h1 className="mt-2 text-xl font-semibold">Local bid encryption</h1>
        <p className="mt-3 text-sm leading-6 text-[#6d6a62]">{status}</p>
      </section>
    </main>
  );
}
