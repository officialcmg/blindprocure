"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Check,
  Copy,
  Eye,
  FileCheck2,
  KeyRound,
  LogIn,
  LogOut,
  Lock,
  Plus,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  usePublicClient,
  useReadContract,
  useReadContracts,
} from "wagmi";
import { encodeFunctionData, isAddress, keccak256, parseEventLogs, toHex, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import {
  blindProcureAbi,
  blindProcureAddress,
  isContractConfigured,
  sepoliaExplorerBaseUrl,
  zamaAclAbi,
} from "@/lib/contract";
import {
  decryptWinningPriceAsDelegate,
  encryptedBidValue,
  encryptedInputProof,
  encryptBidPrice,
  publicDecryptWinnerId,
  zamaAclAddress,
} from "@/lib/zama";
import { usePrivyAccount } from "@/lib/privy-account";

type TenderTuple = readonly [
  Address,
  string,
  Hex,
  bigint,
  bigint,
  boolean,
  number,
  boolean,
  boolean,
  Address,
];

type TxStatus = {
  label: string;
  tx?: Hex;
  tone?: "ok" | "error" | "pending";
};

const demoSpec =
  "Office laptops Q3: 30 developer laptops, 32GB RAM, three-year support, delivery before procurement close.";

const zeroAddress = "0x0000000000000000000000000000000000000000";

function getChainId() {
  return Promise.resolve(sepolia.id);
}

function shortAddress(address?: string) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function specHashFor(text: string) {
  return keccak256(toHex(text));
}

async function waitForReceipt(publicClient: ReturnType<typeof usePublicClient>, tx: Hex) {
  if (!publicClient) throw new Error("Sepolia client is not ready.");
  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({
      hash: tx,
      confirmations: 1,
      timeout: 90_000,
    });
  } catch (error) {
    const transaction = await publicClient.getTransaction({ hash: tx }).catch(() => null);
    if (!transaction) {
      throw new Error(
        "Sepolia could not find this sponsored transaction. It was not broadcast; retry the action.",
        { cause: error },
      );
    }

    throw new Error("The transaction is still pending on Sepolia. Check its explorer page before retrying.", {
      cause: error,
    });
  }

  if (receipt.status !== "success") {
    throw new Error("The transaction reverted on Sepolia. No tender was created.");
  }

  return receipt;
}

function actionErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message;
  if (/user rejected|rejected the request/i.test(message)) {
    return "Transaction cancelled.";
  }
  return message;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}

function formatDeadline(deadline: bigint, nowMs: number) {
  if (!deadline) return "Not set";
  const ms = Number(deadline) * 1000;
  if (nowMs >= ms) return "Closed";
  const totalSeconds = Math.max(0, Math.floor((ms - nowMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

function useTender(tenderId: bigint) {
  return useReadContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "tenders",
    args: [tenderId],
    query: {
      enabled: isContractConfigured && tenderId > 0n,
      refetchInterval: 8000,
    },
  });
}

function useTenderSuppliers(tenderId: bigint, bidCount: number) {
  return useReadContracts({
    contracts: Array.from({ length: bidCount }, (_, index) => ({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "getBidSupplier",
      args: [tenderId, index + 1],
    })),
    query: {
      enabled: isContractConfigured && bidCount > 0,
      refetchInterval: 8000,
    },
  });
}

export function AuthControls() {
  const { ready, authenticated, accountReady, user, login, logout, smartAccountAddress } = usePrivyAccount();
  const identity = user?.email?.address || user?.google?.email;
  const [copied, setCopied] = useState(false);

  async function copyAccountId() {
    if (!smartAccountAddress) return;
    await navigator.clipboard.writeText(smartAccountAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {authenticated ? (
        <>
          <span className="mono rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--ink)]">
            {accountReady ? `${identity || "Signed in"} · ${shortAddress(smartAccountAddress)}` : "Preparing sponsored account..."}
          </span>
          {accountReady && (
            <button
              aria-label="Copy account ID"
              className="grid h-9 w-9 place-items-center rounded border border-[var(--line)]"
              data-account-id={smartAccountAddress}
              onClick={copyAccountId}
              title={smartAccountAddress}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
          <button
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center rounded border border-[var(--line)]"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </>
      ) : (
        <button
          className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          disabled={!ready}
          onClick={() => login({ loginMethods: ["email", "google"] })}
        >
          <LogIn size={16} /> Sign in
        </button>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:flex-row md:items-center md:justify-between">
        <Link href="/app" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-[var(--ink)] text-white">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">BlindProcure</span>
            <span className="block text-sm text-[var(--muted)]">Confidential supplier bidding</span>
          </span>
        </Link>
        <AuthControls />
      </header>
      {children}
    </main>
  );
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "ok" }) {
  const styles =
    tone === "error"
      ? "border-[#d8afa5] bg-[#fff2ef] text-[#7c2d1f]"
      : tone === "ok"
        ? "border-[#9ccdc7] bg-[#edfdfa] text-[#115e59]"
        : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]";

  return <div className={`rounded border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

function ActionButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TxToast({ status }: { status: TxStatus | null }) {
  if (!status) return null;
  const tone = status.tone === "error" ? "error" : status.tone === "ok" ? "ok" : "info";

  return (
    <Notice tone={tone}>
      <div className="flex flex-col gap-1">
        <span>{status.label}</span>
        {status.tx && (
          <a
            className="mono text-xs underline"
            href={`${sepoliaExplorerBaseUrl}/tx/${status.tx}`}
            rel="noreferrer"
            target="_blank"
          >
            View transaction
          </a>
        )}
      </div>
    </Notice>
  );
}

export function HomePage() {
  const outcomes = [
    ["Private price discovery", "Suppliers submit encrypted numbers. Competitors never see losing prices."],
    ["Auditable award path", "The public can inspect tender state, bid count, winner identity, and transaction history."],
    ["Selective disclosure", "Buyers and approved auditors decrypt the winning price without publishing every quote."],
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-[var(--ink)] text-white">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">BlindProcure</span>
            <span className="block text-sm text-[var(--muted)]">Confidential procurement</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link className="hidden text-sm font-semibold text-[var(--muted)] sm:inline" href="/app/tenders">
            Tenders
          </Link>
          <Link className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white" href="/app">
            Open app
          </Link>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-sm font-medium text-[var(--accent-strong)]">
            <Sparkles size={15} /> Powered by Zama FHEVM on Sepolia
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-normal text-[var(--foreground)] sm:text-6xl">
            Procurement without public bid leakage.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            BlindProcure lets buyers run sealed-bid tenders where suppliers encrypt prices in the
            browser, the contract selects the lowest valid offer with FHE, and only the right result
            is revealed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-5 py-3 font-semibold text-white" href="/app">
              Launch workspace <ArrowRight size={18} />
            </Link>
            <Link className="rounded border border-[var(--line)] bg-[var(--panel)] px-5 py-3 font-semibold" href="/app/tenders/new">
              Create tender
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {outcomes.map(([title, body]) => (
              <div key={title} className="border-l border-[var(--line)] pl-4">
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm">
          <div className="border border-[var(--line)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Office laptops Q3</div>
                <div className="text-xs text-[var(--muted)]">Sealed supplier selection</div>
              </div>
              <span className="rounded bg-[#e9f8f5] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                Finalized
              </span>
            </div>
            <div className="grid gap-4 p-4">
              <div className="grid grid-cols-3 gap-3">
                <Metric label="Budget" value="1500" />
                <Metric label="Bids" value="3 encrypted" />
                <Metric label="Winner ID" value="#2" />
              </div>
              <div className="grid gap-2">
                {[
                  ["Bid #1", "0x8579...E09c"],
                  ["Bid #2", "0x479D...BA49"],
                  ["Bid #3", "0x64E1...B7bB"],
                ].map(([bid, supplier], index) => (
                  <div key={bid} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
                    <span className="mono text-xs">{bid}</span>
                    <span className="mono text-xs text-[var(--muted)]">{supplier}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {index === 1 ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                      {index === 1 ? "Selected" : "Encrypted"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 border border-[var(--line)] bg-[#f8fbfa] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <SearchCheck size={16} className="text-[var(--accent)]" /> Audit view
                </div>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  Public viewers see the winning supplier and proof-backed result. Authorized users
                  decrypt only the winning price.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function TendersPage() {
  const nowMs = useNow();
  const { authenticated, accountReady, smartAccountAddress: address, login } = usePrivyAccount();
  const { data: nextTenderId } = useReadContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "nextTenderId",
    query: { enabled: isContractConfigured, refetchInterval: 8000 },
  });
  const count = Number((nextTenderId || 1n) - 1n);
  const ids = Array.from({ length: count }, (_, index) => BigInt(index + 1));
  const tenders = useReadContracts({
    contracts: ids.map((id) => ({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "tenders",
      args: [id],
    })),
    query: { enabled: isContractConfigured && ids.length > 0, refetchInterval: 8000 },
  });
  const tenderRows = useMemo(
    () =>
      tenders.data
        ?.map((result, index) => {
          const tender = result.result as TenderTuple | undefined;
          return tender ? { tenderId: ids[index], tender } : null;
        })
        .filter((row): row is { tenderId: bigint; tender: TenderTuple } => Boolean(row)) || [],
    [ids, tenders.data],
  );
  const myTenderRows = useMemo(
    () => tenderRows.filter((row) => address && row.tender[0].toLowerCase() === address.toLowerCase()),
    [address, tenderRows],
  );
  const activeCount = tenderRows.filter((row) => !row.tender[7] && nowMs < Number(row.tender[3]) * 1000).length;

  return (
    <Shell>
      <section className="py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mono text-xs text-[var(--muted)]">Sepolia workspace</p>
            <h1 className="mt-2 text-3xl font-semibold">Tenders</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">Create a sealed tender, approve suppliers, and finalize the encrypted winner selection.</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-white" href="/app/tenders/new">
            <Plus size={16} /> New tender
          </Link>
        </div>
        {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` to load live tenders.</Notice>}
        {isContractConfigured && (
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Total tenders" value={String(tenderRows.length)} />
              <Metric label="Open tenders" value={String(activeCount)} />
              <Metric label="Created by me" value={address ? String(myTenderRows.length) : "-"} />
            </div>

            {!authenticated && (
              <Notice>
                <button className="font-semibold text-[var(--accent)] underline" onClick={() => login({ loginMethods: ["email", "google"] })}>
                  Sign in
                </button>{" "}
                to create tenders and see your buyer workspace.
              </Notice>
            )}
            {authenticated && !accountReady && <Notice>Preparing your sponsored account...</Notice>}

            {address && (
              <TenderSection
                title="Created by me"
                emptyText="You have not created a tender from this account yet."
                rows={myTenderRows}
                nowMs={nowMs}
              />
            )}

            <TenderSection
              title="All public tenders"
              emptyText="No tenders have been created yet."
              rows={tenderRows}
              nowMs={nowMs}
            />
          </div>
        )}
      </section>
    </Shell>
  );
}

function TenderSection({
  title,
  emptyText,
  rows,
  nowMs,
}: {
  title: string;
  emptyText: string;
  rows: { tenderId: bigint; tender: TenderTuple }[];
  nowMs: number;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded bg-[var(--panel)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <Notice>{emptyText}</Notice>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <TenderListCard key={row.tenderId.toString()} tenderId={row.tenderId} tender={row.tender} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  );
}

function TenderListCard({ tenderId, tender, nowMs }: { tenderId: bigint; tender: TenderTuple; nowMs: number }) {
  return (
    <Link
      className="grid gap-4 rounded border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)] md:grid-cols-[1fr_auto]"
      href={`/app/tenders/${tenderId}`}
    >
      <div>
        <div className="text-lg font-semibold">{tender[1]}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">
          Budget cap {tender[4].toString()} · {tender[6]} encrypted bids · {formatDeadline(tender[3], nowMs)}
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
        Open <ArrowRight size={16} />
      </div>
    </Link>
  );
}

export function CreateTenderPage() {
  const router = useRouter();
  const { authenticated, accountReady, smartAccountAddress: address, sendCall, login } = usePrivyAccount();
  const publicClient = usePublicClient();
  const [title, setTitle] = useState("Office laptops Q3");
  const [spec, setSpec] = useState(demoSpec);
  const [budget, setBudget] = useState("1500");
  const [minutes, setMinutes] = useState("90");
  const [status, setStatus] = useState<TxStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function createTender() {
    if (!address) return;
    let tx: Hex | undefined;
    setIsSubmitting(true);
    setStatus({ label: "Preparing Sepolia transaction...", tone: "pending" });

    try {
      if (!publicClient) throw new Error("Sepolia RPC client is not ready.");

      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(minutes) * 60);
      const args = [title, specHashFor(spec), deadline, BigInt(budget), true] as const;

      await publicClient.simulateContract({
        account: address,
        address: blindProcureAddress,
        abi: blindProcureAbi,
        functionName: "createTender",
        args,
      });

      const data = encodeFunctionData({
        abi: blindProcureAbi,
        functionName: "createTender",
        args,
      });
      tx = await sendCall({
        to: blindProcureAddress,
        data,
        description: "Create confidential tender",
      });
      setStatus({ label: "Creating tender on Sepolia...", tx, tone: "pending" });

      const receipt = await waitForReceipt(publicClient, tx);
      const [created] = parseEventLogs({
        abi: blindProcureAbi,
        eventName: "TenderCreated",
        logs: receipt.logs,
      });
      if (!created) throw new Error("Tender transaction confirmed, but its creation event was not found.");

      setStatus({ label: `Tender #${created.args.tenderId} created.`, tx, tone: "ok" });
      router.push(`/app/tenders/${created.args.tenderId}`);
    } catch (error) {
      setStatus({
        label: actionErrorMessage(error, "Tender creation failed."),
        tx,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl py-8">
        <h1 className="text-3xl font-semibold">Create tender</h1>
        <p className="mt-2 text-[var(--muted)]">Metadata is public. Supplier prices stay encrypted.</p>
        <div className="mt-6 grid gap-4 rounded border border-[var(--line)] bg-[var(--panel)] p-5">
          {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` before creating tenders.</Notice>}
          {!authenticated && (
            <Notice>
              <button className="font-semibold text-[var(--accent)] underline" onClick={() => login({ loginMethods: ["email", "google"] })}>
                Sign in
              </button>{" "}
              to create a tender. Transactions are sponsored.
            </Notice>
          )}
          {authenticated && !accountReady && <Notice>Preparing your sponsored account...</Notice>}
          <label className="grid gap-2 text-sm font-medium">
            Tender title
            <input className="rounded border border-[var(--line)] bg-white px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Spec text
            <textarea className="min-h-28 rounded border border-[var(--line)] bg-white px-3 py-2" value={spec} onChange={(event) => setSpec(event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Budget cap
              <input className="rounded border border-[var(--line)] bg-white px-3 py-2" inputMode="numeric" value={budget} onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Closes in minutes
              <input className="rounded border border-[var(--line)] bg-white px-3 py-2" inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          <ActionButton disabled={!accountReady || !isContractConfigured || !title || !budget || !minutes || isSubmitting} onClick={createTender}>
            <Plus size={16} /> {isSubmitting ? "Creating tender..." : "Create public tender"}
          </ActionButton>
          <TxToast status={status} />
        </div>
      </section>
    </Shell>
  );
}

export function DemoPage() {
  return (
    <Shell>
      <section className="py-8">
        <h1 className="text-3xl font-semibold">Demo tender</h1>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          The recording path uses one live tender: buyer approves three suppliers, suppliers submit encrypted bids,
          buyer finalizes, winner identity is publicly recorded, and the winning price is decrypted by the buyer.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link className="rounded border border-[var(--line)] bg-[var(--panel)] p-5" href="/app/tenders/new">
            <FileCheck2 className="mb-4 text-[var(--accent)]" />
            <div className="font-semibold">Create the demo tender</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Use the prefilled Office laptops Q3 tender.</div>
          </Link>
          <Link className="rounded border border-[var(--line)] bg-[var(--panel)] p-5" href="/app/tenders/1">
            <Trophy className="mb-4 text-[var(--accent)]" />
            <div className="font-semibold">Open tender #1</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Use this once the demo tender exists on Sepolia.</div>
          </Link>
        </div>
      </section>
    </Shell>
  );
}

export function TenderDetailPage({ tenderId }: { tenderId: bigint }) {
  const nowMs = useNow();
  const {
    authenticated,
    accountReady,
    smartAccountAddress: address,
    embeddedWalletAddress,
    sendCall,
    signAsEmbeddedWallet,
  } = usePrivyAccount();
  const publicClient = usePublicClient();
  const nextTenderIdRead = useReadContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "nextTenderId",
    query: { enabled: isContractConfigured, refetchInterval: 8000 },
  });
  const tenderRead = useTender(tenderId);
  const tender = tenderRead.data as TenderTuple | undefined;
  const existsByCounter = nextTenderIdRead.data ? tenderId > 0n && tenderId < nextTenderIdRead.data : undefined;
  const tenderExists = Boolean(existsByCounter && tender && tender[0] !== zeroAddress);
  const bidCount = tenderExists && tender ? Number(tender[6]) : 0;
  const suppliers = useTenderSuppliers(tenderId, bidCount);
  const [supplierInput, setSupplierInput] = useState("");
  const [supplierEmailInput, setSupplierEmailInput] = useState("");
  const [resolvedSupplierState, setResolvedSupplierState] = useState<{ email: string; address: Address } | null>(null);
  const [bidPriceState, setBidPriceState] = useState<{ account?: Address; value: string }>({ value: "" });
  const [auditorInput, setAuditorInput] = useState("");
  const [decryptedPriceState, setDecryptedPriceState] = useState<{ account: Address; value: string } | null>(null);
  const [publicWinnerId, setPublicWinnerId] = useState<string | null>(null);
  const [statusState, setStatusState] = useState<{ account: Address; value: TxStatus } | null>(null);
  const [isActing, setIsActing] = useState(false);

  const bidPrice =
    address && bidPriceState.account?.toLowerCase() === address.toLowerCase() ? bidPriceState.value : "";
  const decryptedPrice =
    address && decryptedPriceState?.account.toLowerCase() === address.toLowerCase()
      ? decryptedPriceState.value
      : null;
  const status =
    address && statusState?.account.toLowerCase() === address.toLowerCase() ? statusState.value : null;

  function setBidPrice(value: string) {
    setBidPriceState({ account: address, value });
  }

  function setDecryptedPrice(value: string | null) {
    setDecryptedPriceState(value && address ? { account: address, value } : null);
  }

  function setStatus(value: TxStatus | null) {
    setStatusState(value && address ? { account: address, value } : null);
  }

  const isBuyer = Boolean(address && tenderExists && tender && address.toLowerCase() === tender[0].toLowerCase());
  const isClosed = tenderExists && tender ? nowMs >= Number(tender[3]) * 1000 : false;
  const winner = tenderExists ? tender?.[9] : undefined;
  const winnerRecorded = (tenderExists && tender?.[8]) || false;

  const currentUserApproval = useReadContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "approved",
    args: [tenderId, (address || zeroAddress) as Address],
    query: { enabled: isContractConfigured && tenderExists && Boolean(address) },
  });
  const currentUserBid = useReadContract({
    address: blindProcureAddress,
    abi: blindProcureAbi,
    functionName: "hasBid",
    args: [tenderId, (address || zeroAddress) as Address],
    query: { enabled: isContractConfigured && tenderExists && Boolean(address) },
  });
  const supplierAddressIsValid = isAddress(supplierInput);
  const supplierEmailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmailInput.trim());
  const myRoleLabel = isBuyer
    ? "Tender creator"
    : currentUserBid.data
      ? "Supplier with submitted bid"
      : currentUserApproval.data
        ? "Approved supplier"
        : authenticated
          ? "Signed-in viewer"
          : "Public viewer";
  const stageItems = tender
    ? [
        { label: "Created", done: true },
        { label: "Bidding", done: tender[6] > 0 || isClosed || tender[7] },
        { label: "Closed", done: isClosed || tender[7] },
        { label: "Finalized", done: tender[7] },
        { label: "Winner public", done: winnerRecorded },
      ]
    : [];

  const submittedSuppliers = useMemo(
    () =>
      suppliers.data
        ?.map((result, index) => ({
          bidId: index + 1,
          supplier: result.result as Address | undefined,
        }))
        .filter((row) => row.supplier) || [],
    [suppliers.data],
  );

  function requireAccount() {
    if (!accountReady || !address) throw new Error("Sign in and wait for your sponsored account to be ready.");
  }

  async function approveSupplierAddress(supplier: Address) {
    requireAccount();
    const data = encodeFunctionData({
      abi: blindProcureAbi,
      functionName: "approveSupplier",
      args: [tenderId, supplier],
    });
    const tx = await sendCall({ to: blindProcureAddress, data, description: "Approve supplier" });
    setStatus({ label: "Approving supplier...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Supplier approved.", tx, tone: "ok" });
  }

  async function approveSupplier() {
    if (!isAddress(supplierInput)) throw new Error("Enter a valid supplier address.");
    await approveSupplierAddress(supplierInput as Address);
  }

  async function approveSupplierEmail() {
    requireAccount();
    const email = supplierEmailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid supplier email address.");
    }

    setStatus({ label: "Resolving supplier email with Privy...", tone: "pending" });
    const response = await fetch("/api/privy/resolve-supplier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json().catch(() => null)) as { address?: string; error?: string } | null;

    if (!response.ok || !result?.address) {
      throw new Error(result?.error || "Supplier email resolution failed.");
    }
    if (!isAddress(result.address)) {
      throw new Error("Privy returned an invalid smart wallet address.");
    }

    setResolvedSupplierState({ email, address: result.address as Address });
    setSupplierInput(result.address);
    await approveSupplierAddress(result.address as Address);
  }

  async function submitEncryptedBid() {
    requireAccount();
    if (!address) throw new Error("Your sponsored account is still being prepared.");
    const price = BigInt(bidPrice);
    const encrypted = await encryptBidPrice({
      contractAddress: blindProcureAddress,
      account: address,
      price,
      getChainId,
    });
    const data = encodeFunctionData({
      abi: blindProcureAbi,
      functionName: "submitBid",
      args: [tenderId, encryptedBidValue(encrypted), encryptedInputProof(encrypted)],
    });
    const tx = await sendCall({ to: blindProcureAddress, data, description: "Submit encrypted bid" });
    setBidPrice("");
    setStatus({ label: "Submitting encrypted bid...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Encrypted bid submitted.", tx, tone: "ok" });
  }

  async function finalizeTender() {
    requireAccount();
    const data = encodeFunctionData({
      abi: blindProcureAbi,
      functionName: "finalizeTender",
      args: [tenderId],
    });
    const tx = await sendCall({ to: blindProcureAddress, data, description: "Finalize confidential tender" });
    setStatus({ label: "Finalizing encrypted winner selection...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Tender finalized.", tx, tone: "ok" });
  }

  async function revealWinner() {
    requireAccount();
    const handle = await publicClient?.readContract({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "winningBidIdHandle",
      args: [tenderId],
    });
    if (!handle) throw new Error("Winning bid ID handle is not ready.");
    const result = await publicDecryptWinnerId({ handle: handle as Hex, getChainId });
    const clearValue = result.clearValues[handle as Hex];
    setPublicWinnerId(String(clearValue));
    const data = encodeFunctionData({
      abi: blindProcureAbi,
      functionName: "recordWinnerFromProof",
      args: [tenderId, result.abiEncodedClearValues, result.decryptionProof],
    });
    const tx = await sendCall({ to: blindProcureAddress, data, description: "Record proof-verified winner" });
    setStatus({ label: "Recording proof-verified winner...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Winner identity recorded.", tx, tone: "ok" });
  }

  async function decryptPrice() {
    requireAccount();
    if (!address || !embeddedWalletAddress) throw new Error("Your private signer is still being prepared.");
    const handle = await publicClient?.readContract({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "winningBidHandle",
      args: [tenderId],
    });
    if (!handle) throw new Error("Winning bid handle is not ready.");

    if (!publicClient) throw new Error("Sepolia RPC client is not ready.");
    const currentExpiry = await publicClient.readContract({
      address: zamaAclAddress,
      abi: zamaAclAbi,
      functionName: "getUserDecryptionDelegationExpirationDate",
      args: [address, embeddedWalletAddress, blindProcureAddress],
    });
    if (currentExpiry <= BigInt(Math.floor(Date.now() / 1000) + 300)) {
      const expiration = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);
      const delegationData = encodeFunctionData({
        abi: zamaAclAbi,
        functionName: "delegateForUserDecryption",
        args: [embeddedWalletAddress, blindProcureAddress, expiration],
      });
      const delegationTx = await sendCall({
        to: zamaAclAddress,
        data: delegationData,
        description: "Enable private result access",
      });
      setStatus({ label: "Enabling private result access...", tx: delegationTx, tone: "pending" });
      await waitForReceipt(publicClient, delegationTx);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      try {
        const value = await decryptWinningPriceAsDelegate({
          contractAddress: blindProcureAddress,
          handle: handle as Hex,
          delegatorAddress: address,
          delegateAddress: embeddedWalletAddress,
          signTypedData: (typedData) => signAsEmbeddedWallet(typedData as never),
          getChainId,
        });
        setDecryptedPrice(String(value));
        setStatus({ label: "Winning price decrypted privately.", tone: "ok" });
        return;
      } catch (error) {
        lastError = error;
        if (attempt === 12 || currentExpiry > BigInt(Math.floor(Date.now() / 1000) + 300)) break;
        setStatus({ label: `Synchronizing private access (${attempt}/12)...`, tone: "pending" });
        await new Promise((resolve) => window.setTimeout(resolve, 15_000));
      }
    }

    throw lastError || new Error("Private decryption was not available.");
  }

  async function grantAuditor() {
    requireAccount();
    if (!isAddress(auditorInput)) throw new Error("Enter a valid auditor address.");
    const data = encodeFunctionData({
      abi: blindProcureAbi,
      functionName: "grantAuditorAccess",
      args: [tenderId, auditorInput as Address],
    });
    const tx = await sendCall({ to: blindProcureAddress, data, description: "Grant auditor access" });
    setStatus({ label: "Granting auditor access...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Auditor can decrypt the winning price.", tx, tone: "ok" });
  }

  async function run(action: () => Promise<void>) {
    if (isActing) return;
    try {
      setIsActing(true);
      setStatus({ label: "Preparing action...", tone: "pending" });
      await action();
      await tenderRead.refetch();
      await suppliers.refetch();
      await currentUserApproval.refetch();
      await currentUserBid.refetch();
    } catch (error) {
      setStatus({ label: actionErrorMessage(error, "Action failed."), tone: "error" });
    } finally {
      setIsActing(false);
    }
  }

  return (
    <Shell>
      <section className="py-8">
        {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` before using the live app.</Notice>}
        {!authenticated && <Notice>Sign in with email or Google to take part. Transaction fees are sponsored.</Notice>}
        {authenticated && !accountReady && <Notice>Preparing your sponsored account...</Notice>}
        {(nextTenderIdRead.isLoading || (existsByCounter !== false && tenderRead.isLoading)) && (
          <Notice>Loading tender state...</Notice>
        )}
        {!nextTenderIdRead.isLoading && !tenderRead.isLoading && !tenderExists && (
          <Notice tone="error">Tender #{tenderId.toString()} was not found.</Notice>
        )}
        {tenderExists && tender && (
          <div className="grid gap-6">
            <section className="border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono rounded bg-white px-2 py-1 text-xs text-[var(--muted)]">Tender #{tenderId.toString()}</span>
                    <StatusBadge label={tender[7] ? "Finalized" : isClosed ? "Ready to finalize" : "Open"} tone={tender[7] ? "ok" : isClosed ? "warn" : "info"} />
                    <StatusBadge label={myRoleLabel} tone={isBuyer ? "ok" : "info"} />
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight">{tender[1]}</h1>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
                    <AddressLine label="Buyer" address={tender[0]} />
                    <AddressLine label="Spec hash" address={tender[2]} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold" href="/app">
                    Back to workspace
                  </Link>
                  <a className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold" href={`${sepoliaExplorerBaseUrl}/address/${blindProcureAddress}`} target="_blank" rel="noreferrer">
                    Contract {shortAddress(blindProcureAddress)}
                  </a>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Budget cap" value={tender[4].toString()} />
                <Metric label="Deadline" value={formatDeadline(tender[3], nowMs)} />
                <Metric label="Encrypted bids" value={String(tender[6])} />
                <Metric label="Winner" value={winnerRecorded && winner && winner !== zeroAddress ? shortAddress(winner) : "Pending"} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-5">
                {stageItems.map((item, index) => (
                  <div key={item.label} className={`border px-3 py-2 text-sm ${item.done ? "border-[var(--accent)] bg-[#e9f8f5] text-[var(--accent-strong)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                    <div className="flex items-center gap-2 font-semibold">
                      {item.done ? <CheckCircle2 size={15} /> : <span className="grid h-[15px] w-[15px] place-items-center rounded-full border border-current text-[10px]">{index + 1}</span>}
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="grid gap-5">
                <Panel icon={<ShieldCheck size={18} />} title="Creator actions">
                  <div className="grid gap-4">
                    {!isBuyer && <Notice>Only the buyer address can approve suppliers, finalize the tender, or grant auditor access.</Notice>}
                    <div className="grid gap-3 border border-[var(--line)] bg-white/60 p-3">
                      <label className="grid gap-2 text-sm font-medium">
                        Supplier email
                        <input
                          className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                          placeholder="supplier@company.com"
                          value={supplierEmailInput}
                          onChange={(event) => setSupplierEmailInput(event.target.value)}
                        />
                      </label>
                      <ActionButton disabled={!isBuyer || tender[6] > 0 || !supplierEmailIsValid || isActing} onClick={() => run(approveSupplierEmail)}>
                        <SearchCheck size={16} /> Resolve email and approve
                      </ActionButton>
                      {resolvedSupplierState && (
                        <Notice tone="ok">
                          {resolvedSupplierState.email} resolves to {shortAddress(resolvedSupplierState.address)}.
                        </Notice>
                      )}
                      {supplierEmailInput && !supplierEmailIsValid && <Notice tone="error">Enter a valid supplier email address.</Notice>}
                    </div>
                    <label className="grid gap-2 text-sm font-medium">
                      Supplier wallet address fallback
                      <input
                        className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                        placeholder="0x..."
                        value={supplierInput}
                        onChange={(event) => setSupplierInput(event.target.value)}
                      />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ActionButton disabled={!isBuyer || tender[6] > 0 || !supplierAddressIsValid || isActing} onClick={() => run(approveSupplier)}>
                        <CheckCircle2 size={16} /> Approve supplier address
                      </ActionButton>
                      <ActionButton disabled={!isBuyer || !isClosed || tender[7] || isActing} onClick={() => run(finalizeTender)}>
                        <RefreshCw size={16} /> Finalize selection
                      </ActionButton>
                    </div>
                    {supplierInput && !supplierAddressIsValid && <Notice tone="error">Enter a valid `0x` supplier address.</Notice>}
                  </div>
                </Panel>

                <Panel icon={<UsersRound size={18} />} title="Encrypted bids">
                  {submittedSuppliers.length === 0 ? (
                    <Notice>No supplier has submitted an encrypted bid yet.</Notice>
                  ) : (
                    <div className="overflow-hidden border border-[var(--line)] bg-white">
                      <div className="grid grid-cols-[72px_1fr_132px] gap-3 border-b border-[var(--line)] bg-[var(--panel-strong)] px-3 py-2 text-xs font-semibold uppercase text-[var(--muted)]">
                        <span>Bid</span>
                        <span>Supplier</span>
                        <span>Status</span>
                      </div>
                      {submittedSuppliers.map((row) => (
                        <div key={row.bidId} className="grid grid-cols-[72px_1fr_132px] gap-3 border-b border-[var(--line)] px-3 py-3 text-sm last:border-b-0">
                          <span className="mono text-xs">#{row.bidId}</span>
                          <span className="mono min-w-0 break-all text-xs text-[var(--muted)]">{row.supplier}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)]">
                            <Lock size={12} /> Encrypted
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel icon={<Trophy size={18} />} title="Award result">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-[var(--muted)]">Public winning supplier</div>
                      <div className="mono min-h-10 break-all border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold">
                        {winnerRecorded && winner && winner !== zeroAddress ? winner : "Not recorded yet"}
                      </div>
                      {publicWinnerId && <Notice tone="ok">Publicly decrypted winning bid ID: {publicWinnerId}</Notice>}
                    </div>
                    <ActionButton disabled={!tender[7] || winnerRecorded || !accountReady || isActing} onClick={() => run(revealWinner)}>
                      <Eye size={16} /> Reveal winner
                    </ActionButton>
                  </div>
                </Panel>
              </div>

              <aside className="grid content-start gap-5">
                <Panel icon={<Lock size={18} />} title="Supplier bid">
                  <div className="grid gap-3">
                    <Notice tone={currentUserApproval.data ? "ok" : "info"}>
                      {currentUserApproval.data
                        ? "This signed-in supplier address is approved."
                        : "Sign in with an approved supplier address before bidding."}
                    </Notice>
                    <label className="grid gap-2 text-sm font-medium">
                      Bid price
                      <input
                        className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="980"
                        value={bidPrice}
                        onChange={(event) => setBidPrice(event.target.value.replace(/\D/g, ""))}
                      />
                    </label>
                    <ActionButton
                      disabled={!accountReady || !currentUserApproval.data || Boolean(currentUserBid.data) || !bidPrice || tender[7] || isClosed || isActing}
                      onClick={() => run(submitEncryptedBid)}
                    >
                      <Lock size={16} /> Encrypt and submit
                    </ActionButton>
                    {currentUserBid.data && <Notice tone="ok">This supplier has already submitted an encrypted bid.</Notice>}
                  </div>
                </Panel>

                <Panel icon={<KeyRound size={18} />} title="Private price access">
                  <div className="grid gap-3">
                    <ActionButton disabled={!tender[7] || !accountReady || isActing} onClick={() => run(decryptPrice)}>
                      <KeyRound size={16} /> Decrypt winning price
                    </ActionButton>
                    {decryptedPrice && <Notice tone="ok">Winning price: {decryptedPrice}</Notice>}
                    <label className="grid gap-2 text-sm font-medium">
                      Auditor wallet address
                      <input
                        className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                        placeholder="0x..."
                        value={auditorInput}
                        onChange={(event) => setAuditorInput(event.target.value)}
                      />
                    </label>
                    <ActionButton disabled={!isBuyer || !tender[7] || !auditorInput || isActing} onClick={() => run(grantAuditor)}>
                      <UsersRound size={16} /> Grant auditor access
                    </ActionButton>
                  </div>
                </Panel>
              </aside>
            </section>
            <TxToast status={status} />
          </div>
        )}
      </section>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--line)] bg-white/60 p-3">
      <div className="text-xs uppercase text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "ok" | "warn" | "info" }) {
  const toneClass =
    tone === "ok"
      ? "bg-[#e9f8f5] text-[var(--accent-strong)]"
      : tone === "warn"
        ? "bg-[#fff4dc] text-[#8a5b00]"
        : "bg-white text-[var(--muted)]";

  return <span className={`rounded px-2 py-1 text-xs font-semibold ${toneClass}`}>{label}</span>;
}

function AddressLine({ label, address }: { label: string; address: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[88px_1fr]">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <span className="mono min-w-0 break-all text-xs">{address}</span>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-5">
      <div className="mb-4 flex items-center gap-2 font-semibold text-[var(--ink)]">
        <span className="text-[var(--accent)]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}
