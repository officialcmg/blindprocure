"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Check,
  CircleAlert,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  Gavel,
  Hourglass,
  Info,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Lock,
  Mail,
  Plus,
  ScanSearch,
  SearchCheck,
  ShieldCheck,
  Timer,
  Trophy,
  UsersRound,
  Wallet,
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
          <span className="inline-flex max-w-full items-center gap-2 border-2 border-[var(--ink)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--ink)]">
            {accountReady ? (
              <>
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-[var(--acid)] outline outline-1 outline-[var(--ink)]" />
                <span className="truncate normal-case">{identity || "Signed in"}</span>
                <span className="mono hidden font-normal normal-case text-[var(--muted)] sm:inline">
                  {shortAddress(smartAccountAddress)}
                </span>
              </>
            ) : (
              <>
                <Loader2 aria-hidden className="animate-spin" size={13} />
                Preparing account...
              </>
            )}
          </span>
          {accountReady && (
            <button
              aria-label={copied ? "Account address copied" : "Copy account address"}
              className="grid h-9 w-9 place-items-center border-2 border-[var(--ink)] bg-[var(--background)] text-[var(--ink)] transition hover:-translate-y-0.5"
              data-account-id={smartAccountAddress}
              onClick={copyAccountId}
              title={smartAccountAddress}
            >
              {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
            </button>
          )}
          <button
            aria-label="Sign out"
            className="grid h-9 w-9 place-items-center border-2 border-[var(--ink)] bg-[var(--background)] text-[var(--ink)] transition hover:-translate-y-0.5"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut aria-hidden size={16} />
          </button>
        </>
      ) : (
        <button
          className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--acid)] px-4 py-2 text-sm font-bold uppercase tracking-widest text-[var(--ink)] transition hover:-translate-y-0.5"
          disabled={!ready}
          onClick={() => login({ loginMethods: ["email", "google"] })}
        >
          <LogIn aria-hidden size={16} strokeWidth={2.5} /> Sign in
        </button>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b-4 border-[var(--ink)] bg-[var(--background)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-base font-black uppercase tracking-tight" aria-label="BlindProcure home">
              <ShieldCheck aria-hidden size={20} strokeWidth={2.5} /> BlindProcure
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
              <Link
                className="px-3 py-1.5 text-sm font-bold uppercase tracking-widest text-[var(--muted)] transition hover:text-[var(--ink)]"
                href="/app"
              >
                Tenders
              </Link>
              <Link
                className="px-3 py-1.5 text-sm font-bold uppercase tracking-widest text-[var(--muted)] transition hover:text-[var(--ink)]"
                href="/app/tenders/new"
              >
                Create
              </Link>
            </nav>
          </div>
          <AuthControls />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t-4 border-[var(--ink)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs font-bold uppercase tracking-widest text-[var(--muted)] sm:px-6 lg:px-8">
          <span>BlindProcure — Sealed-bid procurement on Sepolia</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock aria-hidden size={12} /> Sealed with Zama FHE
          </span>
        </div>
      </footer>
    </div>
  );
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" | "ok" | "warn" }) {
  const styles =
    tone === "error"
      ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
      : tone === "ok"
        ? "border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]"
        : tone === "warn"
          ? "border-[var(--ink)] bg-[var(--warn-soft)] text-[var(--ink)]"
          : "border-[var(--ink)] bg-[var(--panel-strong)] text-[var(--ink)]";
  const icon =
    tone === "error" ? (
      <CircleAlert aria-hidden size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    ) : tone === "ok" ? (
      <CheckCircle2 aria-hidden size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    ) : tone === "warn" ? (
      <Hourglass aria-hidden size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    ) : (
      <Info aria-hidden size={15} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    );

  return (
    <div className={`flex items-start gap-2.5 border-2 px-3.5 py-3 text-sm font-medium leading-6 ${styles}`} role={tone === "error" ? "alert" : "status"}>
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = "primary",
  busy,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  busy?: boolean;
}) {
  const styles =
    variant === "secondary"
      ? "border-2 border-[var(--ink)] bg-[var(--background)] text-[var(--ink)] enabled:hover:-translate-y-0.5"
      : "border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--acid)] enabled:hover:-translate-y-0.5";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest transition ${styles}`}
      disabled={disabled}
      onClick={onClick}
    >
      {busy && <Loader2 aria-hidden className="animate-spin" size={15} />}
      {children}
    </button>
  );
}

function TxToast({ status }: { status: TxStatus | null }) {
  if (!status) return null;

  const isPending = status.tone === "pending" || !status.tone;
  const styles =
    status.tone === "error"
      ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
      : status.tone === "ok"
        ? "border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]"
        : "border-[var(--ink)] bg-[var(--background)] text-[var(--ink)]";
  const icon =
    status.tone === "error" ? (
      <CircleAlert aria-hidden size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    ) : status.tone === "ok" ? (
      <CheckCircle2 aria-hidden size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
    ) : (
      <Loader2 aria-hidden size={16} className="mt-0.5 shrink-0 animate-spin" />
    );

  return (
    <div
      aria-live="polite"
      className={`toast-enter flex items-start gap-3 border-2 px-4 py-3 text-sm shadow-[4px_4px_0_0_var(--ink)] ${styles}`}
      role={status.tone === "error" ? "alert" : "status"}
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium leading-6">
          {status.label}
          {isPending && <span className="ml-1 text-[var(--muted)]">Keep this tab open.</span>}
        </span>
        {status.tx && (
          <a
            className="mono inline-flex items-center gap-1 text-xs underline underline-offset-2"
            href={`${sepoliaExplorerBaseUrl}/tx/${status.tx}`}
            rel="noreferrer"
            target="_blank"
          >
            View transaction on Etherscan <ExternalLink aria-hidden size={11} />
          </a>
        )}
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth bg-[var(--background)] text-[var(--ink)]">
      {/* 01 Hero */}
      <section className="flex min-h-screen snap-start flex-col border-b-4 border-[var(--ink)] px-5 py-6 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between border-b-4 border-[var(--ink)] pb-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-black uppercase tracking-tight" aria-label="BlindProcure home">
            <ShieldCheck aria-hidden size={22} strokeWidth={2.5} /> BlindProcure
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-3">
            <Link
              className="hidden border-2 border-[var(--ink)] px-4 py-2 text-sm font-bold uppercase tracking-widest transition hover:-translate-y-0.5 sm:inline-block"
              href="/app/tenders"
            >
              Tenders
            </Link>
            <Link
              className="border-2 border-[var(--ink)] bg-[var(--acid)] px-5 py-2 text-sm font-bold uppercase tracking-widest transition hover:-translate-y-0.5"
              href="/app"
            >
              Open app
            </Link>
          </nav>
        </header>
        <div className="flex flex-1 flex-col justify-center py-4">
          <div className="mb-6 flex flex-wrap gap-3">
            {["Zama FHEVM", "Sepolia", "Sealed-bid"].map((tag) => (
              <span key={tag} className="inline-block border-2 border-[var(--ink)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-[min(15vw,11svh)] font-black uppercase leading-[0.85] tracking-tighter sm:text-[min(11vw,14svh)]">
            Bids are
            <br />
            <span className="inline-block bg-[var(--ink)] px-3 text-[var(--acid)]">nobody&apos;s</span>
            <br />
            business.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-7">
            Procurement without public bid leakage. Sealed-bid tenders on Ethereum: the smart
            contract picks the cheapest valid offer without ever seeing a single price.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              className="inline-flex items-center gap-3 border-4 border-[var(--ink)] bg-[var(--ink)] px-8 py-4 text-base font-black uppercase tracking-tight text-[var(--acid)] transition hover:-translate-y-1"
              href="/app"
            >
              Launch workspace <ArrowRight aria-hidden size={20} strokeWidth={2.5} />
            </Link>
            <Link
              className="inline-flex items-center gap-2 border-4 border-[var(--ink)] px-8 py-4 text-base font-black uppercase tracking-tight transition hover:-translate-y-1"
              href="/app/tenders/new"
            >
              Create tender
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between border-t-4 border-[var(--ink)] pt-4 text-sm font-bold uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <ArrowDown aria-hidden size={18} strokeWidth={2.5} className="animate-bounce" /> Scroll
          </span>
          <span aria-hidden>01 / 05</span>
        </div>
      </section>

      {/* 02 Problem */}
      <section aria-labelledby="problem-heading" className="flex min-h-screen snap-start flex-col justify-center border-b-4 border-[var(--ink)] bg-[var(--ink)] px-5 py-16 text-[var(--background)] sm:px-10 lg:px-16">
        <div className="mb-10 flex items-center justify-between">
          <span className="inline-block border-2 border-[var(--background)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
            The problem
          </span>
          <span aria-hidden className="text-sm font-bold uppercase tracking-widest text-[var(--danger)]">02 / 05</span>
        </div>
        <h2 id="problem-heading" className="max-w-6xl text-[8vw] font-black uppercase leading-[0.9] tracking-tighter sm:text-[6vw]">
          The chain proves everything.
          <br />
          <span className="text-[var(--danger)]">It also shows everything.</span>
        </h2>
        <div className="mt-12 grid gap-8 border-t-2 border-[var(--background)]/30 pt-8 md:grid-cols-3">
          {[
            ["Verifiable", "Nobody can forge, backdate, or edit the award trail. That part blockchain nailed."],
            ["Transparent", "Every bid posted in plaintext is broadcast to every competitor. Forever."],
            ["Unusable", "So real procurement stayed offchain - the secrets were worth more than the proof."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-2xl font-black uppercase">{title}</h3>
              <p className="mt-3 font-medium leading-6 text-[var(--background)]/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 03 Solution */}
      <section aria-labelledby="solution-heading" className="flex min-h-screen snap-start flex-col justify-center border-b-4 border-[var(--ink)] bg-[var(--acid)] px-5 py-16 sm:px-10 lg:px-16">
        <div className="mb-10 flex items-center justify-between">
          <span className="inline-block border-2 border-[var(--ink)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
            The fix
          </span>
          <span aria-hidden className="text-sm font-bold uppercase tracking-widest">03 / 05</span>
        </div>
        <h2 id="solution-heading" className="max-w-6xl text-[8vw] font-black uppercase leading-[0.9] tracking-tighter sm:text-[6vw]">
          FHE = math that computes
          <br />
          on <span className="inline-block bg-[var(--ink)] px-3 text-[var(--acid)]">sealed</span> data.
        </h2>
        <div className="mt-12 grid border-4 border-[var(--ink)] md:grid-cols-2">
          <div className="border-b-4 border-[var(--ink)] p-8 md:border-b-0 md:border-r-4">
            <h3 className="text-xl font-black uppercase">Before FHE</h3>
            <p className="mt-3 text-lg font-medium leading-7">
              Choose one: a verifiable public ledger <em>or</em> confidential prices. Never both.
            </p>
          </div>
          <div className="bg-[var(--ink)] p-8 text-[var(--background)]">
            <h3 className="text-xl font-black uppercase text-[var(--acid)]">With FHE</h3>
            <p className="mt-3 text-lg font-medium leading-7">
              The contract runs min() over encrypted bids. Execution stays verifiable. Inputs stay
              sealed. The trade-off is dead.
            </p>
          </div>
        </div>
      </section>

      {/* 04 Protocol */}
      <section aria-labelledby="protocol-heading" className="flex min-h-screen snap-start flex-col justify-center border-b-4 border-[var(--ink)] px-5 py-16 sm:px-10 lg:px-16">
        <div className="mb-10 flex items-center justify-between">
          <span className="inline-block border-2 border-[var(--ink)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
            Protocol
          </span>
          <span aria-hidden className="text-sm font-bold uppercase tracking-widest">04 / 05</span>
        </div>
        <h2 id="protocol-heading" className="sr-only">
          How a sealed tender runs
        </h2>
        <ol className="grid border-4 border-[var(--ink)] md:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Publish", "Buyer posts the tender: spec hash, budget cap, deadline. Public. Binding."],
            ["2", "Seal", "Approved suppliers encrypt prices in the browser. Ciphertext only, gas sponsored."],
            ["3", "Select", "The contract compares sealed bids. Lowest valid price wins."],
            ["4", "Prove", "Winner goes public with a decryption proof. Losing prices: sealed forever."],
          ].map(([n, title, body], i) => (
            <li
              key={n}
              className={`flex min-h-64 flex-col justify-between border-b-4 border-[var(--ink)] p-6 last:border-b-0 md:border-b-0 ${i < 3 ? "md:border-r-4" : ""}`}
            >
              <span aria-hidden className={`text-7xl font-black ${i === 3 ? "text-[var(--danger)]" : ""}`}>{n}</span>
              <div>
                <h3 className="text-2xl font-black uppercase">{title}</h3>
                <p className="mt-2 font-medium leading-6">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 flex items-center gap-3 text-lg font-bold uppercase tracking-tight">
          <Lock aria-hidden size={20} strokeWidth={2.5} /> Losing bids are not hidden. They are mathematically unreadable.
        </p>
      </section>

      {/* 05 CTA */}
      <section aria-labelledby="cta-heading" className="flex min-h-screen snap-start flex-col bg-[var(--ink)] px-5 py-16 text-[var(--background)] sm:px-10 lg:px-16">
        <div className="flex flex-1 flex-col justify-center">
          <h2 id="cta-heading" className="text-[12vw] font-black uppercase leading-[0.85] tracking-tighter sm:text-[9vw]">
            Seal your
            <br />
            <span className="text-[var(--acid)]">first tender.</span>
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              className="inline-flex items-center gap-3 border-4 border-[var(--acid)] bg-[var(--acid)] px-10 py-5 text-xl font-black uppercase tracking-tight text-[var(--ink)] transition hover:-translate-y-1"
              href="/app"
            >
              Launch workspace <ArrowRight aria-hidden size={22} strokeWidth={2.5} />
            </Link>
            <span className="text-sm font-bold uppercase tracking-widest text-[var(--background)]/60">
              Email sign-in · zero gas · zero setup
            </span>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--background)]/30 pt-4 text-xs font-bold uppercase tracking-widest text-[var(--background)]/60">
          <span>BlindProcure — sealed with Zama FHE</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock aria-hidden size={12} /> Sepolia
          </span>
        </footer>
      </section>
    </div>
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

  const isLoadingTenders = isContractConfigured && (tenders.isLoading || (nextTenderId === undefined && count === 0));

  return (
    <Shell>
      <section className="py-8">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted)]">Sepolia workspace</p>
            <h1 className="mt-1.5 text-4xl font-black uppercase tracking-tighter sm:text-5xl">Tenders</h1>
            <p className="mt-2 max-w-2xl font-medium leading-7 text-[var(--muted)]">
              Create a sealed tender, approve suppliers, and finalize the encrypted winner selection.
            </p>
          </div>
          <Link
            className="inline-flex shrink-0 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--acid)] px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-[var(--ink)] transition hover:-translate-y-0.5"
            href="/app/tenders/new"
          >
            <Plus aria-hidden size={16} strokeWidth={2.5} /> New tender
          </Link>
        </div>
        {!isContractConfigured && (
          <Notice tone="error">
            Set <code className="mono">NEXT_PUBLIC_BLINDPROCURE_ADDRESS</code> to load live tenders.
          </Notice>
        )}
        {isContractConfigured && (
          <div className="grid gap-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Total tenders" value={String(tenderRows.length)} />
              <Metric label="Open for bidding" value={String(activeCount)} />
              <Metric label="Created by me" value={address ? String(myTenderRows.length) : "Sign in to see"} />
            </div>

            {!authenticated && (
              <Notice>
                <button
                  className="font-bold uppercase tracking-wide text-[var(--ink)] underline underline-offset-4"
                  onClick={() => login({ loginMethods: ["email", "google"] })}
                >
                  Sign in
                </button>{" "}
                with email or Google to create tenders and see your buyer workspace. Transactions are sponsored.
              </Notice>
            )}
            {authenticated && !accountReady && (
              <Notice>
                <span className="inline-flex items-center gap-2">
                  <Loader2 aria-hidden size={14} className="animate-spin" /> Preparing your sponsored account...
                </span>
              </Notice>
            )}

            {isLoadingTenders ? (
              <div className="grid gap-3" aria-live="polite" aria-busy="true">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-24 animate-pulse border-2 border-[var(--ink)]/20 bg-[var(--panel-strong)]" />
                ))}
                <span className="sr-only">Loading tenders...</span>
              </div>
            ) : (
              <>
                {address && (
                  <TenderSection
                    title="Created by me"
                    emptyText="You have not created a tender from this account yet. Create one to start a sealed selection."
                    rows={myTenderRows}
                    nowMs={nowMs}
                    address={address}
                  />
                )}

                <TenderSection
                  title="All public tenders"
                  emptyText="No tenders have been created yet. Be the first to open a sealed-bid tender."
                  rows={tenderRows}
                  nowMs={nowMs}
                  address={address}
                />
              </>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}

function tenderStatus(tender: TenderTuple, nowMs: number): { label: string; tone: "ok" | "warn" | "info" | "accent" } {
  const winnerRecorded = tender[8] && tender[9] !== zeroAddress;
  if (winnerRecorded) return { label: "Winner revealed", tone: "ok" };
  if (tender[7] && tender[6] === 0) return { label: "Closed · no bids", tone: "warn" };
  if (tender[7]) return { label: "Finalized", tone: "ok" };
  if (nowMs >= Number(tender[3]) * 1000) return { label: "Ready to finalize", tone: "warn" };
  return { label: "Open for bids", tone: "accent" };
}

function TenderSection({
  title,
  emptyText,
  rows,
  nowMs,
  address,
}: {
  title: string;
  emptyText: string;
  rows: { tenderId: bigint; tender: TenderTuple }[];
  nowMs: number;
  address?: string;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-center gap-2.5 border-b-2 border-[var(--ink)] pb-2.5">
        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
        <span className="border-2 border-[var(--ink)] px-2 py-0 text-xs font-bold text-[var(--ink)]">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="grid place-items-center gap-3 border-2 border-dashed border-[var(--ink)] px-6 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center border-2 border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]">
            <FileText aria-hidden size={20} strokeWidth={2.5} />
          </span>
          <p className="max-w-md text-sm font-medium leading-6 text-[var(--muted)]">{emptyText}</p>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[var(--ink)] underline underline-offset-4"
            href="/app/tenders/new"
          >
            <Plus aria-hidden size={14} strokeWidth={2.5} /> Create a tender
          </Link>
        </div>
      ) : (
        <ul className="grid list-none gap-3 p-0">
          {rows.map((row) => (
            <li key={row.tenderId.toString()}>
              <TenderListCard tenderId={row.tenderId} tender={row.tender} nowMs={nowMs} address={address} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TenderListCard({
  tenderId,
  tender,
  nowMs,
  address,
}: {
  tenderId: bigint;
  tender: TenderTuple;
  nowMs: number;
  address?: string;
}) {
  const status = tenderStatus(tender, nowMs);
  const isMine = address && tender[0].toLowerCase() === address.toLowerCase();
  const bidsLabel = tender[6] === 1 ? "1 encrypted bid" : `${tender[6]} encrypted bids`;

  return (
    <Link
      className="group grid gap-4 border-2 border-[var(--ink)] bg-[var(--background)] p-4 transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--ink)] sm:grid-cols-[1fr_auto] sm:items-center sm:p-5"
      href={`/app/tenders/${tenderId}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono text-xs font-bold text-[var(--muted)]">#{tenderId.toString()}</span>
          <StatusBadge label={status.label} tone={status.tone} />
          {isMine && <StatusBadge label="Created by me" tone="info" />}
        </div>
        <div className="mt-1.5 truncate text-xl font-black uppercase tracking-tight">{tender[1]}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Banknote aria-hidden size={14} /> Budget cap {tender[4].toString()}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock aria-hidden size={13} /> {bidsLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Timer aria-hidden size={14} /> {formatDeadline(tender[3], nowMs)}
          </span>
        </div>
      </div>
      <span className="hidden items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[var(--ink)] transition group-hover:gap-2.5 sm:inline-flex">
        View <ArrowRight aria-hidden size={16} strokeWidth={2.5} />
      </span>
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
        <nav aria-label="Breadcrumb" className="mb-4 text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
          <Link className="underline underline-offset-4 hover:text-[var(--ink)]" href="/app">
            Tenders
          </Link>
          <span aria-hidden className="mx-2">/</span>
          <span className="text-[var(--ink)]">New tender</span>
        </nav>
        <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">Create tender</h1>
        <p className="mt-2 font-medium leading-7 text-[var(--muted)]">
          Everything on this form is public onchain: title, spec hash, budget cap, and deadline.
          Supplier bid prices are encrypted and never revealed.
        </p>
        <div className="mt-6 grid gap-4 border-2 border-[var(--ink)] bg-[var(--background)] p-5 sm:p-6">
          {!isContractConfigured && (
            <Notice tone="error">
              Set <code className="mono">NEXT_PUBLIC_BLINDPROCURE_ADDRESS</code> before creating tenders.
            </Notice>
          )}
          {!authenticated && (
            <Notice>
              <button
                className="font-bold uppercase tracking-wide text-[var(--ink)] underline underline-offset-4"
                onClick={() => login({ loginMethods: ["email", "google"] })}
              >
                Sign in
              </button>{" "}
              to create a tender. Transactions are sponsored - no gas needed.
            </Notice>
          )}
          {authenticated && !accountReady && (
            <Notice>
              <span className="inline-flex items-center gap-2">
                <Loader2 aria-hidden size={14} className="animate-spin" /> Preparing your sponsored account...
              </span>
            </Notice>
          )}
          <label className="grid gap-1.5 text-sm font-bold uppercase tracking-wide" htmlFor="tender-title">
            Tender title
            <input
              id="tender-title"
              className="border-2 border-[var(--ink)] bg-white px-3.5 py-2.5"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <span className="text-xs font-medium normal-case tracking-normal text-[var(--muted)]">Public. Shown to every viewer.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-bold uppercase tracking-wide" htmlFor="tender-spec">
            Specification
            <textarea
              id="tender-spec"
              className="min-h-28 border-2 border-[var(--ink)] bg-white px-3.5 py-2.5"
              value={spec}
              onChange={(event) => setSpec(event.target.value)}
            />
            <span className="text-xs font-medium normal-case tracking-normal text-[var(--muted)]">
              Only a keccak256 hash of this text goes onchain, so suppliers can verify the spec they were sent.
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold uppercase tracking-wide" htmlFor="tender-budget">
              Budget cap
              <input
                id="tender-budget"
                className="border-2 border-[var(--ink)] bg-white px-3.5 py-2.5"
                inputMode="numeric"
                value={budget}
                onChange={(event) => setBudget(event.target.value.replace(/\D/g, ""))}
              />
              <span className="text-xs font-medium normal-case tracking-normal text-[var(--muted)]">Bids above this cap are rejected by the contract.</span>
            </label>
            <label className="grid gap-1.5 text-sm font-bold uppercase tracking-wide" htmlFor="tender-minutes">
              Bidding window (minutes)
              <input
                id="tender-minutes"
                className="border-2 border-[var(--ink)] bg-white px-3.5 py-2.5"
                inputMode="numeric"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ""))}
              />
              <span className="text-xs font-medium normal-case tracking-normal text-[var(--muted)]">Bidding closes automatically after this window.</span>
            </label>
          </div>
          <div className="mt-1 grid gap-3">
            <ActionButton
              busy={isSubmitting}
              disabled={!accountReady || !isContractConfigured || !title || !budget || !minutes || isSubmitting}
              onClick={createTender}
            >
              {!isSubmitting && <Plus aria-hidden size={16} />}
              {isSubmitting ? "Creating tender..." : "Create public tender"}
            </ActionButton>
            <TxToast status={status} />
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 border-2 border-[var(--ink)] bg-[var(--panel-strong)] px-3.5 py-3 text-sm font-medium leading-6 text-[var(--muted)]">
          <Lock aria-hidden size={14} strokeWidth={2.5} className="mt-1 shrink-0 text-[var(--ink)]" />
          <span>
            After creation you will approve suppliers by email or wallet address. Approved suppliers
            encrypt their prices locally before submitting - no plaintext price ever reaches the chain.
          </span>
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
  const [noValidWinner, setNoValidWinner] = useState(false);
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
    if (tender && tender[6] === 0) {
      throw new Error("This tender closed with no bids submitted. There is no winner to reveal.");
    }
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
    if (Number(clearValue) === 0) {
      setNoValidWinner(true);
      throw new Error("No bid was within the budget cap. This tender has no valid winner to record.");
    }
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

  const isLoadingTender = nextTenderIdRead.isLoading || (existsByCounter !== false && tenderRead.isLoading);

  return (
    <Shell>
      <section className="grid gap-4 py-8">
        {!isContractConfigured && (
          <Notice tone="error">
            Set <code className="mono">NEXT_PUBLIC_BLINDPROCURE_ADDRESS</code> before using the live app.
          </Notice>
        )}
        {!authenticated && !isLoadingTender && tenderExists && (
          <Notice>Sign in with email or Google to take part. Transaction fees are sponsored.</Notice>
        )}
        {authenticated && !accountReady && (
          <Notice>
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden size={14} className="animate-spin" /> Preparing your sponsored account...
            </span>
          </Notice>
        )}
        {isLoadingTender && (
          <div className="grid gap-4" aria-live="polite" aria-busy="true">
            <div className="h-52 animate-pulse border-2 border-[var(--ink)]/20 bg-[var(--panel-strong)]" />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="h-64 animate-pulse border-2 border-[var(--ink)]/20 bg-[var(--panel-strong)]" />
              <div className="h-64 animate-pulse border-2 border-[var(--ink)]/20 bg-[var(--panel-strong)]" />
            </div>
            <span className="sr-only">Loading tender state...</span>
          </div>
        )}
        {!isLoadingTender && !tenderExists && (
          <div className="grid place-items-center gap-3 border-2 border-dashed border-[var(--ink)] px-6 py-14 text-center">
            <span className="grid h-11 w-11 place-items-center border-2 border-[var(--ink)] bg-[var(--danger-soft)] text-[var(--danger)]">
              <CircleAlert aria-hidden size={20} />
            </span>
            <p className="text-lg font-black uppercase tracking-tight">Tender #{tenderId.toString()} was not found.</p>
            <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
              It may not exist yet on Sepolia, or the ID is wrong.
            </p>
            <Link className="text-sm font-bold uppercase tracking-widest text-[var(--ink)] underline underline-offset-4" href="/app">
              Back to all tenders
            </Link>
          </div>
        )}
        {tenderExists && tender && (
          <div className="grid gap-5">
            <nav aria-label="Breadcrumb" className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">
              <Link className="underline underline-offset-4 hover:text-[var(--ink)]" href="/app">
                Tenders
              </Link>
              <span aria-hidden className="mx-2">/</span>
              <span className="text-[var(--ink)]">Tender #{tenderId.toString()}</span>
            </nav>

            <section className="border-2 border-[var(--ink)] bg-[var(--background)]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono border-2 border-[var(--ink)] bg-white px-2 py-1 text-xs font-bold text-[var(--ink)]">
                        Tender #{tenderId.toString()}
                      </span>
                      <StatusBadge {...tenderStatus(tender, nowMs)} />
                      {authenticated && <StatusBadge label={myRoleLabel} tone={isBuyer ? "ok" : "info"} />}
                    </div>
                    <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-tighter sm:text-4xl">{tender[1]}</h1>
                    <div className="mt-4 grid gap-2">
                      <AddressLine label="Buyer" address={tender[0]} />
                      <AddressLine label="Spec hash" address={tender[2]} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-white px-3 py-2 text-sm font-bold uppercase tracking-wide transition hover:-translate-y-0.5"
                      href={`${sepoliaExplorerBaseUrl}/address/${blindProcureAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Contract {shortAddress(blindProcureAddress)} <ExternalLink aria-hidden size={13} />
                    </a>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Budget cap" value={tender[4].toString()} />
                  <Metric label="Deadline" value={formatDeadline(tender[3], nowMs)} />
                  <Metric label="Encrypted bids" value={String(tender[6])} />
                  <Metric
                    label="Winner"
                    value={winnerRecorded && winner && winner !== zeroAddress ? shortAddress(winner) : "Not revealed"}
                    hint={winnerRecorded && winner && winner !== zeroAddress ? winner : undefined}
                  />
                </div>
              </div>

              <div className="border-t-2 border-[var(--ink)] bg-[var(--panel-strong)] px-5 py-4 sm:px-6">
                <h2 className="sr-only">Tender progress</h2>
                <ol className="grid gap-2 sm:grid-cols-5">
                  {stageItems.map((item, index) => {
                    const isCurrent = !item.done && stageItems.slice(0, index).every((prev) => prev.done);
                    return (
                      <li
                        key={item.label}
                        aria-current={isCurrent ? "step" : undefined}
                        className={`flex items-center gap-2 border-2 px-3 py-2 text-sm font-bold uppercase tracking-wide ${
                          item.done
                            ? "border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]"
                            : isCurrent
                              ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--background)]"
                              : "border-[var(--ink)]/30 bg-transparent text-[var(--muted)]"
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 aria-hidden size={15} className="shrink-0" />
                        ) : (
                          <span
                            aria-hidden
                            className="grid h-[17px] w-[17px] shrink-0 place-items-center border border-current text-[10px] font-bold"
                          >
                            {index + 1}
                          </span>
                        )}
                        {item.label}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
              <div className="grid gap-5">
                {!tender[7] && (
                  <Panel
                    icon={<ShieldCheck size={16} />}
                    title="Buyer actions"
                    subtitle={
                      isClosed
                        ? "Bidding is closed. Finalize to run the encrypted winner selection."
                        : "Approve suppliers while bidding is open, then finalize after the deadline."
                    }
                  >
                    <div className="grid gap-4">
                      {!isBuyer && (
                        <Notice>
                          Only the buyer address can approve suppliers, finalize the tender, or grant auditor access.
                        </Notice>
                      )}
                      {!isClosed && tender[6] === 0 && (
                        <>
                          <div className="grid gap-3 border-2 border-[var(--ink)] bg-white p-4">
                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                              <Mail aria-hidden size={14} strokeWidth={2.5} className="text-[var(--ink)]" /> Approve supplier by email
                            </div>
                            <p className="text-xs leading-5 text-[var(--muted)]">
                              The email resolves to the supplier&apos;s smart account via Privy. Approvals lock once the
                              first bid arrives.
                            </p>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <label className="sr-only" htmlFor="supplier-email">
                                Supplier email
                              </label>
                              <input
                                id="supplier-email"
                                type="email"
                                className="border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm"
                                placeholder="supplier@company.com"
                                value={supplierEmailInput}
                                onChange={(event) => setSupplierEmailInput(event.target.value)}
                              />
                              <ActionButton
                                disabled={!isBuyer || !supplierEmailIsValid || isActing}
                                onClick={() => run(approveSupplierEmail)}
                              >
                                <SearchCheck aria-hidden size={16} /> Approve
                              </ActionButton>
                            </div>
                            {resolvedSupplierState && (
                              <Notice tone="ok">
                                {resolvedSupplierState.email} resolves to {shortAddress(resolvedSupplierState.address)}.
                              </Notice>
                            )}
                            {supplierEmailInput && !supplierEmailIsValid && (
                              <Notice tone="error">Enter a valid supplier email address.</Notice>
                            )}
                          </div>
                          <div className="grid gap-3 border-2 border-[var(--ink)] bg-white p-4">
                            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                              <Wallet aria-hidden size={14} strokeWidth={2.5} className="text-[var(--ink)]" /> Approve supplier by wallet address
                            </div>
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <label className="sr-only" htmlFor="supplier-address">
                                Supplier wallet address
                              </label>
                              <input
                                id="supplier-address"
                                className="mono border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm"
                                placeholder="0x..."
                                value={supplierInput}
                                onChange={(event) => setSupplierInput(event.target.value)}
                              />
                              <ActionButton
                                disabled={!isBuyer || !supplierAddressIsValid || isActing}
                                onClick={() => run(approveSupplier)}
                              >
                                <CheckCircle2 aria-hidden size={16} /> Approve
                              </ActionButton>
                            </div>
                            {supplierInput && !supplierAddressIsValid && (
                              <Notice tone="error">Enter a valid 0x supplier address.</Notice>
                            )}
                          </div>
                        </>
                      )}
                      {!isClosed && tender[6] > 0 && (
                        <Notice>
                          Supplier approvals are locked: the first encrypted bid has arrived. The whitelist froze the
                          moment bidding started.
                        </Notice>
                      )}
                      <div className="grid gap-3 border-2 border-[var(--ink)] bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                          <Gavel aria-hidden size={14} strokeWidth={2.5} className="text-[var(--ink)]" /> Finalize selection
                        </div>
                        <p className="text-xs leading-5 text-[var(--muted)]">
                          {isClosed
                            ? "Finalizing asks the contract to compare encrypted bids and select the lowest valid one."
                            : "Available once the bidding deadline passes."}
                        </p>
                        <ActionButton disabled={!isBuyer || !isClosed || isActing} onClick={() => run(finalizeTender)}>
                          <Gavel aria-hidden size={16} /> Finalize selection
                        </ActionButton>
                      </div>
                    </div>
                  </Panel>
                )}

                <Panel
                  icon={<UsersRound size={16} />}
                  title="Encrypted bids"
                  subtitle="Bidder identities are public. Every price stays encrypted onchain."
                >
                  {submittedSuppliers.length === 0 ? (
                    <div className="grid place-items-center gap-2 border-2 border-dashed border-[var(--ink)] px-5 py-8 text-center">
                      <Hourglass aria-hidden size={18} className="text-[var(--muted)]" />
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        No supplier has submitted an encrypted bid yet.
                        {!isClosed && " Approved suppliers can bid until the deadline."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border-2 border-[var(--ink)] bg-white">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b-2 border-[var(--ink)] bg-[var(--panel-strong)] text-left text-xs font-bold uppercase tracking-[0.15em] text-[var(--ink)]">
                            <th className="w-16 px-3.5 py-2.5 font-semibold" scope="col">
                              Bid
                            </th>
                            <th className="px-3.5 py-2.5 font-semibold" scope="col">
                              Supplier
                            </th>
                            <th className="w-32 px-3.5 py-2.5 font-semibold" scope="col">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {submittedSuppliers.map((row) => {
                            const isWinnerRow =
                              winnerRecorded && winner && winner !== zeroAddress && row.supplier?.toLowerCase() === winner.toLowerCase();
                            return (
                              <tr
                                key={row.bidId}
                                className={`border-b border-[var(--ink)]/20 last:border-b-0 ${isWinnerRow ? "bg-[var(--acid)]/40" : ""}`}
                              >
                                <td className="mono px-3.5 py-3 text-xs font-medium">#{row.bidId}</td>
                                <td className="mono min-w-0 break-all px-3.5 py-3 text-xs text-[var(--muted)]">
                                  {row.supplier}
                                </td>
                                <td className="px-3.5 py-3">
                                  {isWinnerRow ? (
                                    <span className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--acid)] px-2.5 py-0.5 text-xs font-bold uppercase text-[var(--ink)]">
                                      <Trophy aria-hidden size={11} /> Winner
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--panel-strong)] px-2.5 py-0.5 text-xs font-bold uppercase text-[var(--ink)]">
                                      <Lock aria-hidden size={11} /> Encrypted
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Panel>

                {tender[7] && tender[6] === 0 && (
                  <Panel
                    icon={<Trophy size={16} />}
                    title="Award result"
                    subtitle="This tender's deadline passed with no encrypted bids submitted."
                  >
                    <Notice tone="warn">
                      No supplier submitted a bid before the deadline. There is no winner to reveal - this
                      tender is closed with no award.
                    </Notice>
                  </Panel>
                )}

                {tender[7] && tender[6] > 0 && (
                  <Panel
                    icon={<Trophy size={16} />}
                    title="Award result"
                    subtitle={
                      winnerRecorded
                        ? "The winner identity is public, backed by a decryption proof. Losing prices stay sealed."
                        : "Anyone can publish the winner identity with a decryption proof. Losing prices stay sealed."
                    }
                  >
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Public winning supplier
                        </div>
                        <div
                          className={`mono flex min-h-11 items-center break-all border-2 px-3.5 py-2.5 text-sm font-semibold ${
                            winnerRecorded && winner && winner !== zeroAddress
                              ? "border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]"
                              : "border-[var(--ink)] bg-white text-[var(--muted)]"
                          }`}
                        >
                          {winnerRecorded && winner && winner !== zeroAddress ? winner : "Not recorded yet"}
                        </div>
                      </div>
                      {publicWinnerId && !noValidWinner && (
                        <Notice tone="ok">Publicly decrypted winning bid ID: {publicWinnerId}</Notice>
                      )}
                      {noValidWinner && (
                        <Notice tone="warn">
                          Every submitted bid was above the budget cap. No bid qualifies to win - this tender
                          closes with no award.
                        </Notice>
                      )}
                      {!winnerRecorded && !noValidWinner && (
                        <div>
                          <ActionButton disabled={!accountReady || isActing} onClick={() => run(revealWinner)}>
                            <Eye aria-hidden size={16} /> Reveal winner
                          </ActionButton>
                        </div>
                      )}
                    </div>
                  </Panel>
                )}
              </div>

              <aside className="grid content-start gap-5">
                {!isClosed && !tender[7] && (
                  <Panel
                    icon={<Lock size={16} />}
                    title="Submit a bid"
                    subtitle="Your price is encrypted in this browser before submission. It never leaves your device in plaintext."
                  >
                    <div className="grid gap-3">
                      {authenticated ? (
                        currentUserBid.data ? (
                          <Notice tone="ok">You have already submitted an encrypted bid for this tender.</Notice>
                        ) : currentUserApproval.data ? (
                          <Notice tone="ok">Your signed-in supplier account is approved to bid.</Notice>
                        ) : (
                          <Notice>
                            Your account is not approved for this tender yet. Ask the buyer to approve your email or
                            wallet address.
                          </Notice>
                        )
                      ) : (
                        <Notice>Sign in with an approved supplier account to bid.</Notice>
                      )}
                      {!currentUserBid.data && (
                        <>
                          <label className="grid gap-1.5 text-sm font-bold uppercase tracking-wide" htmlFor="bid-price">
                            Bid price
                            <input
                              id="bid-price"
                              className="border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm"
                              inputMode="numeric"
                              placeholder="980"
                              value={bidPrice}
                              onChange={(event) => setBidPrice(event.target.value.replace(/\D/g, ""))}
                            />
                            <span className="text-xs font-medium normal-case tracking-normal leading-5 text-[var(--muted)]">
                              Must be at or below the budget cap of {tender[4].toString()}.
                            </span>
                          </label>
                          <ActionButton
                            disabled={!accountReady || !currentUserApproval.data || !bidPrice || isActing}
                            onClick={() => run(submitEncryptedBid)}
                          >
                            <Lock aria-hidden size={16} /> Encrypt and submit bid
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </Panel>
                )}
                {isClosed && !tender[7] && (
                  <Panel
                    icon={<Hourglass size={16} />}
                    title="Bidding closed"
                    subtitle="The deadline has passed. No new bids can be submitted."
                  >
                    <Notice>
                      {currentUserBid.data
                        ? "Your encrypted bid is in. Waiting for the buyer to finalize the selection."
                        : "Waiting for the buyer to finalize the encrypted winner selection."}
                    </Notice>
                  </Panel>
                )}

                {tender[7] && (
                  <Panel
                    icon={<KeyRound size={16} />}
                    title="Private price access"
                    subtitle="Only the buyer and approved auditors can decrypt the winning price. It is never published."
                  >
                    <div className="grid gap-4">
                      <div className="grid gap-2.5">
                        <ActionButton disabled={!accountReady || isActing} onClick={() => run(decryptPrice)}>
                          <KeyRound aria-hidden size={16} /> Decrypt winning price
                        </ActionButton>
                        {decryptedPrice ? (
                          <div className="border-2 border-[var(--ink)] bg-[var(--acid)] px-3.5 py-3">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink)]">
                              Winning price (visible only to you)
                            </div>
                            <div className="mono mt-1 text-2xl font-black text-[var(--ink)]">{decryptedPrice}</div>
                          </div>
                        ) : (
                          <p className="text-xs leading-5 text-[var(--muted)]">
                            Decryption runs through the Zama relayer and can take a moment on first use.
                          </p>
                        )}
                      </div>
                      {isBuyer && (
                        <div className="grid gap-2.5 border-t-2 border-[var(--ink)] pt-4">
                          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
                            <ScanSearch aria-hidden size={14} strokeWidth={2.5} className="text-[var(--ink)]" /> Grant auditor access
                          </div>
                          <p className="text-xs leading-5 text-[var(--muted)]">
                            Let an auditor decrypt the winning price without making it public.
                          </p>
                          <label className="sr-only" htmlFor="auditor-address">
                            Auditor wallet address
                          </label>
                          <input
                            id="auditor-address"
                            className="mono border-2 border-[var(--ink)] bg-white px-3.5 py-2.5 text-sm"
                            placeholder="0x..."
                            value={auditorInput}
                            onChange={(event) => setAuditorInput(event.target.value)}
                          />
                          <ActionButton
                            disabled={!auditorInput || isActing}
                            onClick={() => run(grantAuditor)}
                            variant="secondary"
                          >
                            <UsersRound aria-hidden size={16} /> Grant auditor access
                          </ActionButton>
                        </div>
                      )}
                    </div>
                  </Panel>
                )}
              </aside>
            </section>
            {status && (
              <div className="sticky bottom-4 z-10">
                <TxToast status={status} />
              </div>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--background)] px-3.5 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 truncate text-lg font-black tracking-tight" title={hint || value}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "ok" | "warn" | "info" | "accent" }) {
  const toneClass =
    tone === "ok"
      ? "border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]"
      : tone === "warn"
        ? "border-[var(--ink)] bg-[var(--warn-soft)] text-[var(--ink)]"
        : tone === "accent"
          ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--acid)]"
          : "border-[var(--ink)] bg-[var(--background)] text-[var(--ink)]";

  return (
    <span className={`inline-flex items-center border-2 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${toneClass}`}>
      {label}
    </span>
  );
}

function AddressLine({ label, address }: { label: string; address: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[96px_1fr] sm:gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted)] sm:pt-0.5">{label}</span>
      <span className="mono min-w-0 break-all text-xs leading-5 text-[var(--ink)]">{address}</span>
    </div>
  );
}

function Panel({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-2 border-[var(--ink)] bg-[var(--background)]">
      <div className="flex items-start gap-3 border-b-2 border-[var(--ink)] px-5 py-4">
        <span aria-hidden className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border-2 border-[var(--ink)] bg-[var(--acid)] text-[var(--ink)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black uppercase tracking-tight text-[var(--ink)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm font-medium leading-6 text-[var(--muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
