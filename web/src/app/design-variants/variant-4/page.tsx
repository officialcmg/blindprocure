import type { Metadata } from "next";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { ArrowDown, ArrowRight, Lock, ShieldCheck } from "lucide-react";

const archivo = Archivo({ subsets: ["latin"], weight: ["500", "700", "900"] });

export const metadata: Metadata = { title: "Variant 4 · Signal" };

/* Design variant mockup: "Signal" - brutalist modernist poster.
   Static preview only. Not wired to contract/auth. */

const paper = "#f2f2ee";
const ink = "#111111";
const acid = "#c8f542";
const red = "#e63b2e";

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section
      className="flex min-h-screen snap-start flex-col justify-center border-b-4 px-6 py-16 sm:px-10 lg:px-16"
      style={{ borderColor: ink, background: paper, color: ink, ...style }}
    >
      {children}
    </section>
  );
}

function Tag({ children, invert = false }: { children: React.ReactNode; invert?: boolean }) {
  return (
    <span
      className="inline-block border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]"
      style={invert ? { borderColor: paper, color: paper } : { borderColor: ink, color: ink }}
    >
      {children}
    </span>
  );
}

export default function Variant4() {
  return (
    <div className={`${archivo.className} h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth`} style={{ background: paper }}>
      {/* 01 Hero */}
      <Section>
        <header className="flex items-center justify-between border-b-4 pb-4" style={{ borderColor: ink }}>
          <span className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
            <ShieldCheck size={22} strokeWidth={2.5} /> BlindProcure
          </span>
          <Link
            href="#"
            className="border-2 px-5 py-2 text-sm font-bold uppercase tracking-widest transition hover:-translate-y-0.5"
            style={{ borderColor: ink, background: acid }}
          >
            Open app
          </Link>
        </header>
        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mb-8 flex flex-wrap gap-3">
            <Tag>Zama FHEVM</Tag>
            <Tag>Sepolia</Tag>
            <Tag>Sealed-bid</Tag>
          </div>
          <h1 className="text-[15vw] font-black uppercase leading-[0.85] tracking-tighter sm:text-[11vw]">
            Bids are
            <br />
            <span className="inline-block px-3" style={{ background: ink, color: acid }}>
              nobody&apos;s
            </span>
            <br />
            business.
          </h1>
          <p className="mt-8 max-w-xl text-lg font-medium leading-7">
            Sealed-bid procurement on Ethereum. The smart contract picks the cheapest valid offer -
            without ever seeing a single price.
          </p>
        </div>
        <div className="flex items-center justify-between border-t-4 pt-4 text-sm font-bold uppercase tracking-widest" style={{ borderColor: ink }}>
          <span className="flex items-center gap-2">
            <ArrowDown size={18} strokeWidth={2.5} className="animate-bounce" /> Scroll
          </span>
          <span>01 / 05</span>
        </div>
      </Section>

      {/* 02 Problem */}
      <Section style={{ background: ink, color: paper }}>
        <div className="mb-10 flex items-center justify-between">
          <Tag invert>The problem</Tag>
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: red }}>02 / 05</span>
        </div>
        <h2 className="max-w-6xl text-[8vw] font-black uppercase leading-[0.9] tracking-tighter sm:text-[6vw]">
          The chain proves everything.
          <br />
          <span style={{ color: red }}>It also shows everything.</span>
        </h2>
        <div className="mt-12 grid gap-8 border-t-2 pt-8 md:grid-cols-3" style={{ borderColor: "rgba(242,242,238,0.3)" }}>
          {[
            ["Verifiable", "Nobody can forge, backdate, or edit the award trail. That part blockchain nailed."],
            ["Transparent", "Every bid posted in plaintext is broadcast to every competitor. Forever."],
            ["Unusable", "So real procurement stayed offchain - the secrets were worth more than the proof."],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-2xl font-black uppercase">{title}</h3>
              <p className="mt-3 font-medium leading-6" style={{ color: "rgba(242,242,238,0.7)" }}>{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 03 Solution */}
      <Section style={{ background: acid }}>
        <div className="mb-10 flex items-center justify-between">
          <Tag>The fix</Tag>
          <span className="text-sm font-bold uppercase tracking-widest">03 / 05</span>
        </div>
        <h2 className="max-w-6xl text-[8vw] font-black uppercase leading-[0.9] tracking-tighter sm:text-[6vw]">
          FHE = math that
          <br />
          computes on <span className="inline-block px-3" style={{ background: ink, color: acid }}>sealed</span> data.
        </h2>
        <div className="mt-12 grid gap-0 border-4 md:grid-cols-2" style={{ borderColor: ink }}>
          <div className="border-b-4 p-8 md:border-b-0 md:border-r-4" style={{ borderColor: ink }}>
            <h3 className="text-xl font-black uppercase">Before FHE</h3>
            <p className="mt-3 text-lg font-medium leading-7">
              Choose one: a verifiable public ledger <em>or</em> confidential prices. Never both.
            </p>
          </div>
          <div className="p-8" style={{ background: ink, color: paper }}>
            <h3 className="text-xl font-black uppercase" style={{ color: acid }}>With FHE</h3>
            <p className="mt-3 text-lg font-medium leading-7">
              The contract runs min() over encrypted bids. Execution stays verifiable. Inputs stay
              sealed. The trade-off is dead.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Protocol */}
      <Section>
        <div className="mb-10 flex items-center justify-between">
          <Tag>Protocol</Tag>
          <span className="text-sm font-bold uppercase tracking-widest">04 / 05</span>
        </div>
        <div className="grid border-4 md:grid-cols-2 lg:grid-cols-4" style={{ borderColor: ink }}>
          {[
            ["1", "Publish", "Buyer posts tender: spec hash, budget cap, deadline. Public. Binding."],
            ["2", "Seal", "Suppliers encrypt prices in the browser. Ciphertext only, gas sponsored."],
            ["3", "Select", "Contract compares sealed bids. Lowest valid price wins."],
            ["4", "Prove", "Winner goes public with a proof. Losing prices: sealed forever."],
          ].map(([n, title, body], i) => (
            <div
              key={n}
              className={`flex min-h-64 flex-col justify-between border-b-4 p-6 last:border-b-0 md:border-b-0 ${i < 3 ? "md:border-r-4" : ""}`}
              style={{ borderColor: ink }}
            >
              <span className="text-7xl font-black" style={{ color: i === 3 ? red : ink }}>{n}</span>
              <div>
                <h3 className="text-2xl font-black uppercase">{title}</h3>
                <p className="mt-2 font-medium leading-6">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 flex items-center gap-3 text-lg font-bold uppercase tracking-tight">
          <Lock size={20} strokeWidth={2.5} /> Losing bids are not hidden. They are mathematically unreadable.
        </p>
      </Section>

      {/* 05 CTA */}
      <Section style={{ background: ink, color: paper, borderBottom: "none" }}>
        <div className="flex flex-1 flex-col justify-center">
          <h2 className="text-[12vw] font-black uppercase leading-[0.85] tracking-tighter sm:text-[9vw]">
            Seal your
            <br />
            <span style={{ color: acid }}>first tender.</span>
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              href="#"
              className="inline-flex items-center gap-3 border-4 px-10 py-5 text-xl font-black uppercase tracking-tight transition hover:-translate-y-1"
              style={{ borderColor: acid, background: acid, color: ink }}
            >
              Launch workspace <ArrowRight size={22} strokeWidth={2.5} />
            </Link>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "rgba(242,242,238,0.6)" }}>
              Email sign-in · zero gas · zero setup
            </span>
          </div>
        </div>
        <footer className="flex items-center justify-between border-t-2 pt-4 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "rgba(242,242,238,0.3)", color: "rgba(242,242,238,0.6)" }}>
          <span>BlindProcure — sealed with Zama FHE</span>
          <Link href="/design-variants" className="underline underline-offset-4">Back to variants</Link>
        </footer>
      </Section>
    </div>
  );
}
