"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileCheck2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSignTypedData,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { isAddress, keccak256, toHex, type Address, type Hex } from "viem";
import {
  blindProcureAbi,
  blindProcureAddress,
  isContractConfigured,
  sepoliaExplorerBaseUrl,
} from "@/lib/contract";
import {
  decryptWinningPrice,
  encryptBidPrice,
  publicDecryptWinnerId,
} from "@/lib/zama";

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
  if (!publicClient) throw new Error("Wallet client is not ready.");
  await publicClient.waitForTransactionReceipt({ hash: tx });
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

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const injected = connectors[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isConnected ? (
        <>
          <span className="mono rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--ink)]">
            {shortAddress(address)}
          </span>
          {chainId !== sepolia.id && (
            <button
              className="rounded bg-[var(--danger)] px-3 py-2 text-sm font-semibold text-white"
              onClick={() => switchChain({ chainId: sepolia.id })}
            >
              Switch to Sepolia
            </button>
          )}
          <button
            className="rounded border border-[var(--line)] px-3 py-2 text-sm"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          disabled={!injected || isPending}
          onClick={() => connect({ connector: injected })}
        >
          Connect wallet
        </button>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-[var(--ink)] text-white">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="block text-lg font-semibold">BlindProcure</span>
            <span className="block text-sm text-[var(--muted)]">Confidential supplier bidding</span>
          </span>
        </Link>
        <WalletConnect />
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
  return (
    <Shell>
      <section className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-sm text-[var(--muted)]">
            Zama FHEVM procurement demo
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-[var(--foreground)] sm:text-5xl">
            Choose the cheapest compliant supplier without exposing losing bids.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
            Buyers get an auditable tender. Suppliers keep price strategy private. Zama FHE lets the
            contract compare encrypted bids and reveal only the winning supplier.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-5 py-3 font-semibold text-white"
              href="/demo"
            >
              Open demo flow <ArrowRight size={18} />
            </Link>
            <Link className="rounded border border-[var(--line)] px-5 py-3 font-semibold" href="/tenders/new">
              Create tender
            </Link>
          </div>
        </div>
        <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="grid gap-3">
            {[
              ["Buyer posts tender", "Title, deadline, spec hash, budget cap are public."],
              ["Suppliers encrypt bids", "The browser submits encrypted handles and input proof."],
              ["Contract selects winner", "FHE comparisons choose the lowest valid encrypted bid."],
              ["Only allowed reveal", "Public sees winner identity; buyer decrypts winning price."],
            ].map(([title, body]) => (
              <div key={title} className="rounded border border-[var(--line)] bg-white/60 p-4">
                <div className="font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

export function TendersPage() {
  const nowMs = useNow();
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

  return (
    <Shell>
      <section className="py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Tenders</h1>
            <p className="mt-2 text-[var(--muted)]">Public procurement metadata with confidential bid prices.</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-white" href="/tenders/new">
            <Plus size={16} /> New tender
          </Link>
        </div>
        {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` to load live tenders.</Notice>}
        {isContractConfigured && ids.length === 0 && <Notice>No tenders have been created yet.</Notice>}
        <div className="grid gap-3">
          {tenders.data?.map((result, index) => {
            const tender = result.result as TenderTuple | undefined;
            if (!tender) return null;
            return <TenderListCard key={ids[index].toString()} tenderId={ids[index]} tender={tender} nowMs={nowMs} />;
          })}
        </div>
      </section>
    </Shell>
  );
}

function TenderListCard({ tenderId, tender, nowMs }: { tenderId: bigint; tender: TenderTuple; nowMs: number }) {
  return (
    <Link
      className="grid gap-4 rounded border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)] md:grid-cols-[1fr_auto]"
      href={`/tenders/${tenderId}`}
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
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [title, setTitle] = useState("Office laptops Q3");
  const [spec, setSpec] = useState(demoSpec);
  const [budget, setBudget] = useState("1500");
  const [minutes, setMinutes] = useState("5");
  const [status, setStatus] = useState<TxStatus | null>(null);

  async function createTender() {
    if (!address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(minutes) * 60);
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "createTender",
      args: [title, specHashFor(spec), deadline, BigInt(budget), true],
    });
    setStatus({ label: "Creating tender...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Tender created.", tx, tone: "ok" });
  }

  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl py-8">
        <h1 className="text-3xl font-semibold">Create tender</h1>
        <p className="mt-2 text-[var(--muted)]">Metadata is public. Supplier prices stay encrypted.</p>
        <div className="mt-6 grid gap-4 rounded border border-[var(--line)] bg-[var(--panel)] p-5">
          {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` before creating tenders.</Notice>}
          {!isConnected && <Notice>Connect the buyer wallet to create the tender.</Notice>}
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
          <ActionButton disabled={!isConnected || !isContractConfigured || !title || !budget || !minutes} onClick={createTender}>
            <Plus size={16} /> Create public tender
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
          <Link className="rounded border border-[var(--line)] bg-[var(--panel)] p-5" href="/tenders/new">
            <FileCheck2 className="mb-4 text-[var(--accent)]" />
            <div className="font-semibold">Create the demo tender</div>
            <div className="mt-2 text-sm text-[var(--muted)]">Use the prefilled Office laptops Q3 tender.</div>
          </Link>
          <Link className="rounded border border-[var(--line)] bg-[var(--panel)] p-5" href="/tenders/1">
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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
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
  const [bidPrice, setBidPrice] = useState("");
  const [auditorInput, setAuditorInput] = useState("");
  const [decryptedPrice, setDecryptedPrice] = useState<string | null>(null);
  const [publicWinnerId, setPublicWinnerId] = useState<string | null>(null);
  const [status, setStatus] = useState<TxStatus | null>(null);

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

  async function ensureSepolia() {
    if (chainId !== sepolia.id) {
      switchChain({ chainId: sepolia.id });
      throw new Error("Switch to Sepolia and retry the action.");
    }
  }

  async function approveSupplier() {
    await ensureSepolia();
    if (!isAddress(supplierInput)) throw new Error("Enter a valid supplier address.");
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "approveSupplier",
      args: [tenderId, supplierInput as Address],
    });
    setStatus({ label: "Approving supplier...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Supplier approved.", tx, tone: "ok" });
  }

  async function submitEncryptedBid() {
    await ensureSepolia();
    if (!address) throw new Error("Connect a supplier wallet.");
    const price = BigInt(bidPrice);
    const encrypted = await encryptBidPrice({
      contractAddress: blindProcureAddress,
      account: address,
      price,
      getChainId,
    });
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "submitBid",
      args: [tenderId, toHex(encrypted.handles[0], { size: 32 }), toHex(encrypted.inputProof)],
    });
    setBidPrice("");
    setStatus({ label: "Submitting encrypted bid...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Encrypted bid submitted.", tx, tone: "ok" });
  }

  async function finalizeTender() {
    await ensureSepolia();
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "finalizeTender",
      args: [tenderId],
    });
    setStatus({ label: "Finalizing encrypted winner selection...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Tender finalized.", tx, tone: "ok" });
  }

  async function revealWinner() {
    await ensureSepolia();
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
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "recordWinnerFromProof",
      args: [tenderId, result.abiEncodedClearValues, result.decryptionProof],
    });
    setStatus({ label: "Recording proof-verified winner...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Winner identity recorded.", tx, tone: "ok" });
  }

  async function decryptPrice() {
    await ensureSepolia();
    if (!address) throw new Error("Connect an authorized buyer or auditor wallet.");
    const handle = await publicClient?.readContract({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "winningBidHandle",
      args: [tenderId],
    });
    if (!handle) throw new Error("Winning bid handle is not ready.");
    const value = await decryptWinningPrice({
      contractAddress: blindProcureAddress,
      handle: handle as Hex,
      account: address,
      signTypedData: (typedData) => signTypedDataAsync(typedData as never),
      getChainId,
    });
    setDecryptedPrice(String(value));
  }

  async function grantAuditor() {
    await ensureSepolia();
    if (!isAddress(auditorInput)) throw new Error("Enter a valid auditor address.");
    const tx = await writeContractAsync({
      address: blindProcureAddress,
      abi: blindProcureAbi,
      functionName: "grantAuditorAccess",
      args: [tenderId, auditorInput as Address],
    });
    setStatus({ label: "Granting auditor access...", tx, tone: "pending" });
    await waitForReceipt(publicClient, tx);
    setStatus({ label: "Auditor can decrypt the winning price.", tx, tone: "ok" });
  }

  async function run(action: () => Promise<void>) {
    try {
      setStatus({ label: "Preparing action...", tone: "pending" });
      await action();
      await tenderRead.refetch();
      await suppliers.refetch();
      await currentUserApproval.refetch();
      await currentUserBid.refetch();
    } catch (error) {
      setStatus({ label: error instanceof Error ? error.message : "Action failed.", tone: "error" });
    }
  }

  return (
    <Shell>
      <section className="py-8">
        {!isContractConfigured && <Notice tone="error">Set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` before using the live app.</Notice>}
        {(nextTenderIdRead.isLoading || (existsByCounter !== false && tenderRead.isLoading)) && (
          <Notice>Loading tender state...</Notice>
        )}
        {!nextTenderIdRead.isLoading && !tenderRead.isLoading && !tenderExists && (
          <Notice tone="error">Tender #{tenderId.toString()} was not found.</Notice>
        )}
        {tenderExists && tender && (
          <div className="grid gap-5">
            <div className="rounded border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="mono text-xs text-[var(--muted)]">Tender #{tenderId.toString()}</p>
                  <h1 className="mt-2 text-3xl font-semibold">{tender[1]}</h1>
                  <p className="mt-2 max-w-3xl text-[var(--muted)]">
                    Suppliers submit encrypted prices. The contract chooses the lowest bid under the public budget cap.
                  </p>
                </div>
                <a className="mono text-xs underline" href={`${sepoliaExplorerBaseUrl}/address/${blindProcureAddress}`} target="_blank" rel="noreferrer">
                  Contract {shortAddress(blindProcureAddress)}
                </a>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Budget cap" value={tender[4].toString()} />
                <Metric label="Deadline" value={formatDeadline(tender[3], nowMs)} />
                <Metric label="Encrypted bids" value={String(tender[6])} />
                <Metric label="Status" value={tender[7] ? "Finalized" : isClosed ? "Ready to finalize" : "Open"} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-5">
                <Panel icon={<UsersRound size={18} />} title="Encrypted bid ledger">
                  {submittedSuppliers.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No encrypted bids yet.</p>
                  ) : (
                    <div className="grid gap-2">
                      {submittedSuppliers.map((row) => (
                        <div key={row.bidId} className="grid gap-2 rounded border border-[var(--line)] bg-white/60 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                          <span className="mono text-xs">Bid #{row.bidId}</span>
                          <span className="mono text-xs text-[var(--muted)]">{row.supplier}</span>
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--panel-strong)] px-2 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                            <Lock size={12} /> Price encrypted
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel icon={<Trophy size={18} />} title="Winner reveal">
                  <div className="grid gap-3">
                    <div className="rounded border border-[var(--line)] bg-white/60 p-3">
                      <div className="text-sm text-[var(--muted)]">Winning supplier</div>
                      <div className="mono mt-1 break-all text-sm font-semibold">
                        {winnerRecorded && winner && winner !== zeroAddress ? winner : "Not publicly recorded"}
                      </div>
                    </div>
                    {publicWinnerId && <Notice tone="ok">Publicly decrypted winning bid ID: {publicWinnerId}</Notice>}
                    <ActionButton disabled={!tender[7] || winnerRecorded || !isConnected} onClick={() => run(revealWinner)}>
                      <Eye size={16} /> Reveal winner identity
                    </ActionButton>
                  </div>
                </Panel>
              </div>

              <div className="grid gap-5">
                <Panel icon={<ShieldCheck size={18} />} title="Buyer controls">
                  <div className="grid gap-3">
                    <input
                      className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                      placeholder="Supplier address to approve"
                      value={supplierInput}
                      onChange={(event) => setSupplierInput(event.target.value)}
                    />
                    <ActionButton disabled={!isBuyer || tender[6] > 0 || !supplierInput} onClick={() => run(approveSupplier)}>
                      <CheckCircle2 size={16} /> Approve supplier
                    </ActionButton>
                    <ActionButton disabled={!isBuyer || !isClosed || tender[7]} onClick={() => run(finalizeTender)}>
                      <RefreshCw size={16} /> Finalize encrypted selection
                    </ActionButton>
                  </div>
                </Panel>

                <Panel icon={<Lock size={18} />} title="Supplier bid">
                  <div className="grid gap-3">
                    <Notice tone={currentUserApproval.data ? "ok" : "info"}>
                      {currentUserApproval.data
                        ? "This wallet is approved for the tender."
                        : "Connect an approved supplier wallet before bidding."}
                    </Notice>
                    <input
                      className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                      inputMode="numeric"
                      placeholder="Encrypted bid price"
                      value={bidPrice}
                      onChange={(event) => setBidPrice(event.target.value.replace(/\D/g, ""))}
                    />
                    <ActionButton
                      disabled={!isConnected || !currentUserApproval.data || Boolean(currentUserBid.data) || !bidPrice || tender[7] || isClosed}
                      onClick={() => run(submitEncryptedBid)}
                    >
                      <Lock size={16} /> Encrypt and submit bid
                    </ActionButton>
                    {currentUserBid.data && <Notice tone="ok">This wallet has already submitted an encrypted bid.</Notice>}
                  </div>
                </Panel>

                <Panel icon={<KeyRound size={18} />} title="Selective price access">
                  <div className="grid gap-3">
                    <ActionButton disabled={!tender[7] || !isConnected} onClick={() => run(decryptPrice)}>
                      <KeyRound size={16} /> Decrypt winning price
                    </ActionButton>
                    {decryptedPrice && <Notice tone="ok">Winning price: {decryptedPrice}</Notice>}
                    <input
                      className="rounded border border-[var(--line)] bg-white px-3 py-2 text-sm"
                      placeholder="Auditor address"
                      value={auditorInput}
                      onChange={(event) => setAuditorInput(event.target.value)}
                    />
                    <ActionButton disabled={!isBuyer || !tender[7] || !auditorInput} onClick={() => run(grantAuditor)}>
                      <UsersRound size={16} /> Grant auditor access
                    </ActionButton>
                  </div>
                </Panel>
              </div>
            </div>
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
