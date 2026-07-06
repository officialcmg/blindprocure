import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowDown, ArrowRight, ArrowUpRight, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz"] });

export const metadata: Metadata = { title: "Variant 1 · Ledger" };

/* Design variant mockup: "Ledger" - editorial institutional.
   Static preview only. Not wired to contract/auth. */

const paper = "#f7f3ea";
const ink = "#141210";
const rule = "#c9bfa9";
const teal = "#0e6b60";

function Section({ children, alt = false }: { children: React.ReactNode; alt?: boolean }) {
  return (
    <section
      className="flex min-h-screen snap-start flex-col justify-center px-6 py-20 sm:px-12 lg:px-24"
      style={{ background: alt ? ink : paper, color: alt ? paper : ink }}
    >
      {children}
    </section>
  );
}

function Kicker({ n, label, light = false }: { n: string; label: string; light?: boolean }) {
  return (
    <div
      className="mb-10 flex items-baseline gap-4 border-b pb-4 text-sm uppercase tracking-[0.25em]"
      style={{ borderColor: light ? "rgba(247,243,234,0.25)" : rule, color: light ? "rgba(247,243,234,0.6)" : "#6d6553" }}
    >
      <span className={`${fraunces.className} text-2xl italic`} style={{ color: light ? paper : teal }}>
        {n}
      </span>
      {label}
    </div>
  );
}

export default function Variant1() {
  return (
    <div className={`${fraunces.variable} h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth`} style={{ background: paper, color: ink }}>
      {/* 01 Hero */}
      <section className="relative flex min-h-screen snap-start flex-col px-6 sm:px-12 lg:px-24" style={{ background: paper }}>
        <header className="flex items-center justify-between border-b py-5" style={{ borderColor: rule }}>
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em]">
            <ShieldCheck size={16} /> BlindProcure
          </span>
          <span className="text-xs uppercase tracking-[0.25em]" style={{ color: "#6d6553" }}>
            Est. on Ethereum · Sealed by Zama FHE
          </span>
        </header>
        <div className="flex flex-1 flex-col justify-center">
          <p className="mb-6 text-sm uppercase tracking-[0.3em]" style={{ color: teal }}>
            Confidential procurement, on the record
          </p>
          <h1 className={`${fraunces.className} max-w-5xl text-[13vw] leading-[0.95] tracking-tight sm:text-[9vw] lg:text-[7.5vw]`}>
            Every bid <em className="italic" style={{ color: teal }}>sealed.</em>
            <br />
            Every award <em className="italic">proven.</em>
          </h1>
          <div className="mt-12 flex flex-wrap items-center gap-8">
            <Link
              href="#"
              className="inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-90"
              style={{ background: ink }}
            >
              Open the workspace <ArrowRight size={16} />
            </Link>
            <span className="max-w-xs text-sm leading-6" style={{ color: "#6d6553" }}>
              Sealed-bid tenders where the smart contract picks the winner without reading a single price.
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t py-5 text-xs uppercase tracking-[0.25em]" style={{ borderColor: rule, color: "#6d6553" }}>
          <span>Scroll — the case for sealed bids</span>
          <ArrowDown size={14} className="animate-bounce" />
        </div>
      </section>

      {/* 02 Problem */}
      <Section alt>
        <Kicker n="I" label="The problem" light />
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
          <h2 className={`${fraunces.className} text-5xl leading-[1.05] sm:text-6xl lg:text-7xl`}>
            The blockchain is a glass filing cabinet.
          </h2>
          <div className="grid gap-6 text-lg leading-8" style={{ color: "rgba(247,243,234,0.75)" }}>
            <p>
              Public chains give procurement what it always wanted: an award trail nobody can forge,
              backdate, or quietly edit. Perfect verifiability.
            </p>
            <p>
              But verifiability came at a price - <em className={`${fraunces.className} italic`} style={{ color: paper }}>total transparency</em>.
              Post a bid onchain and every competitor reads your number. Your pricing strategy becomes
              public infrastructure. Open bidding leaks commercial intelligence to exactly the people
              who should never see it.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-px" style={{ background: "rgba(247,243,234,0.25)" }}>
              <div className="p-5" style={{ background: ink }}>
                <Eye size={18} className="mb-3" style={{ color: paper }} />
                <div className="text-sm font-semibold">What you get</div>
                <div className="mt-1 text-sm" style={{ color: "rgba(247,243,234,0.6)" }}>Tamper-proof records</div>
              </div>
              <div className="p-5" style={{ background: ink }}>
                <EyeOff size={18} className="mb-3" style={{ color: "#e07a5f" }} />
                <div className="text-sm font-semibold">What you lose</div>
                <div className="mt-1 text-sm" style={{ color: "rgba(247,243,234,0.6)" }}>Every secret you post</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 03 Solution */}
      <Section>
        <Kicker n="II" label="The solution" />
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className={`${fraunces.className} text-5xl leading-[1.05] sm:text-6xl lg:text-7xl`}>
              Compute on secrets.
              <br />
              <span style={{ color: teal }}>Never reveal them.</span>
            </h2>
            <p className="mt-8 max-w-lg text-lg leading-8" style={{ color: "#54503f" }}>
              Fully homomorphic encryption lets the contract compare bids <em>while they stay encrypted</em>.
              The chain finds the lowest valid price without ever holding a plaintext number. Verifiability
              stays. Transparency becomes optional - and precise.
            </p>
          </div>
          {/* Ciphertext ledger figure */}
          <figure className="border" style={{ borderColor: ink }}>
            <figcaption className="border-b px-5 py-3 text-xs uppercase tracking-[0.25em]" style={{ borderColor: ink, color: "#6d6553" }}>
              Tender №42 - as the chain sees it
            </figcaption>
            {[
              ["Supplier A", "0x9f2e···c41a", false],
              ["Supplier B", "0x71d8···0b3f", true],
              ["Supplier C", "0xe4a0···77d2", false],
            ].map(([name, cipher, winner]) => (
              <div key={name as string} className="flex items-center justify-between border-b px-5 py-4 last:border-b-0" style={{ borderColor: rule }}>
                <span className="text-sm font-semibold">{name}</span>
                <span className="font-mono text-sm" style={{ color: "#6d6553" }}>{cipher}</span>
                {winner ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: teal }}>
                    <CheckCircle2 size={14} /> Selected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest" style={{ color: "#a89e88" }}>
                    <Lock size={13} /> Sealed
                  </span>
                )}
              </div>
            ))}
            <div className="px-5 py-4 text-sm italic" style={{ background: "#efe9db", color: "#54503f" }}>
              The winner is proven onchain. The losing prices are mathematically unreadable - forever.
            </div>
          </figure>
        </div>
      </Section>

      {/* 04 Protocol */}
      <Section>
        <Kicker n="III" label="The protocol" />
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: ink }}>
          {[
            ["Publish", "A buyer opens a tender. Title, spec hash, budget cap, deadline - all public, all binding."],
            ["Seal", "Approved suppliers encrypt prices in their own browser. Ciphertext is all that travels."],
            ["Select", "Past the deadline, the contract compares encrypted bids and finds the lowest valid one."],
            ["Prove", "The winner's identity goes public with a decryption proof. Losing prices never exist in plaintext."],
          ].map(([title, body], i) => (
            <div key={title} className="flex min-h-64 flex-col justify-between p-6" style={{ background: paper }}>
              <span className={`${fraunces.className} text-6xl italic`} style={{ color: rule }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className={`${fraunces.className} text-2xl`}>{title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "#54503f" }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 05 CTA */}
      <Section alt>
        <div className="flex flex-1 flex-col items-start justify-center">
          <h2 className={`${fraunces.className} max-w-4xl text-6xl leading-[1.02] sm:text-7xl lg:text-8xl`}>
            Run the first tender <em className="italic" style={{ color: "#7ad0c4" }}>nobody can spy on.</em>
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              href="#"
              className="inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] transition hover:opacity-90"
              style={{ background: paper, color: ink }}
            >
              Launch workspace <ArrowUpRight size={16} />
            </Link>
            <span className="text-sm" style={{ color: "rgba(247,243,234,0.6)" }}>
              Email sign-in · gas sponsored · Sepolia
            </span>
          </div>
        </div>
        <footer className="flex items-center justify-between border-t pt-5 text-xs uppercase tracking-[0.25em]" style={{ borderColor: "rgba(247,243,234,0.25)", color: "rgba(247,243,234,0.5)" }}>
          <span>BlindProcure</span>
          <Link href="/design-variants" className="underline underline-offset-4">Back to variants</Link>
        </footer>
      </Section>
    </div>
  );
}
