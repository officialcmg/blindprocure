"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { QueryClientProvider } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { sepolia } from "viem/chains";
import { WagmiProvider } from "wagmi";
import { queryClient, wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const clientId =
    process.env.NEXT_PUBLIC_PRIVY_USE_APP_CLIENT === "true"
      ? process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim()
      : undefined;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (pathname === "/encrypt-bid") {
    return <>{children}</>;
  }

  if (!appId) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f2eb] px-6 text-[#171714]">
        <div className="max-w-lg border border-[#d8d0c0] bg-white p-6">
          <h1 className="text-xl font-semibold">Privy configuration required</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d6a62]">
            Set NEXT_PUBLIC_PRIVY_APP_ID to start BlindProcure.
          </p>
        </div>
      </main>
    );
  }

  if (!mounted) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f2eb] px-6 text-[#171714]">
        <div className="max-w-lg border border-[#d8d0c0] bg-white p-6">
          <h1 className="text-xl font-semibold">BlindProcure</h1>
          <p className="mt-2 text-sm leading-6 text-[#6d6a62]">Preparing secure account access...</p>
        </div>
      </main>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId || undefined}
      config={{
        loginMethods: ["email", "google"],
        supportedChains: [sepolia],
        defaultChain: sepolia,
        appearance: {
          theme: "light",
          accentColor: "#147d74",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SmartWalletsProvider>{children}</SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
