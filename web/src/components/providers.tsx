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
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="max-w-lg border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_0_var(--ink)]">
          <h1 className="text-xl font-black uppercase tracking-tight">Privy configuration required</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
            Set NEXT_PUBLIC_PRIVY_APP_ID to start BlindProcure.
          </p>
        </div>
      </main>
    );
  }

  if (!mounted) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 text-[var(--foreground)]">
        <div className="flex max-w-lg items-center gap-3 border-2 border-[var(--ink)] bg-white p-6 shadow-[6px_6px_0_0_var(--ink)]">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)]/20 border-t-[var(--ink)]"
          />
          <div>
            <h1 className="text-base font-black uppercase tracking-tight">BlindProcure</h1>
            <p className="mt-0.5 text-sm font-medium leading-6 text-[var(--muted)]">Preparing secure account access...</p>
          </div>
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
          accentColor: "#111111",
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
