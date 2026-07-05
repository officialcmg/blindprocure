import { NextResponse } from "next/server";
import { isAddress } from "viem";

export const runtime = "nodejs";

type PrivyLinkedAccount = {
  type?: string;
  address?: string;
  wallet_client_type?: string;
  walletClientType?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function smartWalletAddress(linkedAccounts: PrivyLinkedAccount[]) {
  const smartWallet = linkedAccounts.find(
    (account) => account.type === "smart_wallet" && account.address && isAddress(account.address),
  );
  if (smartWallet?.address) return smartWallet.address;

  const wallet = linkedAccounts.find((account) => {
    const walletClientType = account.wallet_client_type || account.walletClientType;
    return (
      account.type === "wallet" &&
      walletClientType === "privy_smart_account" &&
      account.address &&
      isAddress(account.address)
    );
  });
  return wallet?.address;
}

export async function POST(request: Request) {
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    return jsonError("Privy server credentials are not configured.", 501);
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter a valid supplier email address.", 400);
  }

  const response = await fetch("https://auth.privy.io/api/v1/users/email/address", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
      "content-type": "application/json",
      "privy-app-id": appId,
    },
    body: JSON.stringify({ address: email }),
  });

  if (response.status === 404) {
    return jsonError("No Privy user was found for that email.", 404);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return jsonError(payload?.error || payload?.message || "Privy user lookup failed.", response.status);
  }

  const user = payload?.user || payload;
  const linkedAccounts = (user?.linked_accounts || user?.linkedAccounts || []) as PrivyLinkedAccount[];
  const address = smartWalletAddress(linkedAccounts);

  if (!address) {
    return jsonError("That Privy user does not have a linked smart wallet address yet.", 404);
  }

  return NextResponse.json({ email, address });
}
