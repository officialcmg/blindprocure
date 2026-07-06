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

const ISOLATION_HELP_URL =
  "https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated";

export default function EncryptBidPage() {
  const [status, setStatus] = useState("Preparing encrypted bid helper...");
  const [isolationFailed, setIsolationFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channelName = params.get("channel");
    if (!channelName) {
      return;
    }

    const channel = new BroadcastChannel(channelName);

    // The encryption WASM module requires SharedArrayBuffer, which only works in a
    // "cross-origin isolated" window (this page sets the COOP/COEP/Permissions-Policy
    // headers for that). Some browsers don't grant isolation to a popup the same way
    // Chromium does. Check for it immediately instead of letting the WASM init hang
    // for a full minute before failing with a cryptic timeout.
    if (!window.crossOriginIsolated) {
      const message =
        "This browser did not grant the isolated mode this popup needs to encrypt your bid. " +
        "Chrome and Edge support it reliably; some Firefox and Safari configurations " +
        "(especially private/incognito windows) block it. Try a normal Chrome or Edge window.";
      queueMicrotask(() => {
        setIsolationFailed(true);
        setStatus(message);
      });
      channel.postMessage({ type: "error", message });
      return () => channel.close();
    }

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
    <main className="grid min-h-screen place-items-center bg-[#f2f2ee] px-6 text-[#111111]">
      <section className="w-full max-w-md border-2 border-[#111111] bg-white p-6 shadow-[6px_6px_0_0_#111111]">
        <p className="text-xs font-bold uppercase tracking-[0.2em]">BlindProcure</p>
        <h1 className="mt-2 text-xl font-black uppercase tracking-tight">Local bid encryption</h1>
        <p
          className="mt-3 flex items-start gap-2.5 text-sm font-medium leading-6 text-[#55554f]"
          role="status"
          aria-live="polite"
        >
          {!isolationFailed && (
            <span
              aria-hidden
              className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#11111133] border-t-[#111111]"
            />
          )}
          {status}
        </p>
        {isolationFailed ? (
          <a
            className="mt-4 inline-block border-t-2 border-[#111111] pt-3 text-xs font-bold uppercase tracking-wide text-[#111111] underline underline-offset-4"
            href={ISOLATION_HELP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Learn about cross-origin isolation
          </a>
        ) : (
          <p className="mt-4 border-t-2 border-[#111111] pt-3 text-xs font-medium leading-5 text-[#55554f]">
            This window encrypts your bid price on your device using Zama FHE, then closes itself. Your
            plaintext price never leaves this browser.
          </p>
        )}
      </section>
    </main>
  );
}
