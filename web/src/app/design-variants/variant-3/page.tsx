import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { ArrowDown, ArrowRight, BadgeCheck, Eye, KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";

const grotesk = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = { title: "Variant 3 · Vault" };

/* Design variant mockup: "Vault" - premium dark fintech.
   Static preview only. Not wired to contract/auth. */

const bg = "#07090f";
const text = "#e8eaf2";
const dim = "#8b93ab";
const gold = "#d4af6a";
const teal = "#2dd4bf";
const cardBg = "rgba(255,255,255,0.03)";
const cardLine = "rgba(255,255,255,0.08)";

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen snap-start flex-col justify-center overflow-hidden px-6 py-20 sm:px-12 lg:px-24">
      {children}
    </section>
  );
}

function Glow({ color, className }: { color: string; className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-[140px] ${className}`}
      style={{ background: color, opacity: 0.16 }}
    />
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-6 inline-flex items-center gap-2 self-start rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em]"
      style={{ borderColor: cardLine, color: gold, background: cardBg }}
    >
      {children}
    </p>
  );
}

export default function Variant3() {
  return (
    <div className={`${grotesk.className} h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth`} style={{ background: bg, color: text }}>
      {/* 01 Hero */}
      <section className="relative flex min-h-screen snap-start flex-col overflow-hidden px-6 sm:px-12 lg:px-24">
        <Glow color={teal} className="left-[-10%] top-[-20%] h-[60vh] w-[60vh]" />
        <Glow color={gold} className="bottom-[-25%] right-[-10%] h-[70vh] w-[70vh]" />
        <header className="relative z-10 flex items-center justify-between py-6">
          <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, #2dd4bf22, #d4af6a22)", border: `1px solid ${cardLine}` }}>
              <ShieldCheck size={17} style={{ color: gold }} />
            </span>
            BlindProcure
          </span>
          <Link
            href="#"
            className="rounded-full px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: text, color: bg }}
          >
            Open app
          </Link>
        </header>
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <Pill>
            <Sparkles size={13} /> Zama FHEVM · Sepolia
          </Pill>
          <h1 className="max-w-5xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.5rem]">
            The vault where
            <br />
            <span
              style={{
                background: `linear-gradient(90deg, ${teal}, ${gold})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              bids stay sealed.
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8" style={{ color: dim }}>
            Sealed-bid procurement on Ethereum. Suppliers encrypt prices in the browser, the contract
            selects the lowest valid offer without decrypting a thing, and only the winner is revealed.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold transition hover:opacity-90"
              style={{ background: `linear-gradient(90deg, ${teal}, #14b8a6)`, color: "#04211c" }}
            >
              Launch workspace <ArrowRight size={17} />
            </Link>
            <span className="text-sm" style={{ color: dim }}>Email sign-in · gas sponsored</span>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center gap-2 pb-8 text-xs uppercase tracking-[0.25em]" style={{ color: dim }}>
          <ArrowDown size={13} className="animate-bounce" /> The paradox
        </div>
      </section>

      {/* 02 Problem */}
      <Section>
        <Glow color="#f87171" className="right-[10%] top-[10%] h-[40vh] w-[40vh]" />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Pill>The paradox</Pill>
            <h2 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Blockchains made records <span style={{ color: teal }}>verifiable</span> - and secrets{" "}
              <span style={{ color: "#f87171" }}>impossible</span>.
            </h2>
            <p className="mt-8 max-w-lg text-lg leading-8" style={{ color: dim }}>
              A public ledger proves every award was fair. It also broadcasts every bid to every
              competitor. For procurement, that trade was never acceptable: the audit trail cost more
              than it protected.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              ["Verifiability", "Immutable award trail, open to any auditor", true],
              ["Neutral execution", "Rules enforced by code, not committees", true],
              ["Privacy", "Every posted price is public forever", false],
            ].map(([title, body, good]) => (
              <div
                key={title as string}
                className="rounded-2xl border p-6 backdrop-blur"
                style={{ borderColor: good ? cardLine : "rgba(248,113,113,0.3)", background: cardBg }}
              >
                <div className="flex items-center gap-2.5 font-semibold">
                  {good ? <BadgeCheck size={18} style={{ color: teal }} /> : <Eye size={18} style={{ color: "#f87171" }} />}
                  {title}
                  {!good && <span className="ml-auto text-xs font-medium uppercase tracking-widest" style={{ color: "#f87171" }}>broken</span>}
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: dim }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 03 Solution */}
      <Section>
        <Glow color={teal} className="left-[5%] bottom-[5%] h-[50vh] w-[50vh]" />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-14 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            {/* vault card */}
            <div className="rounded-3xl border p-2" style={{ borderColor: cardLine, background: cardBg }}>
              <div className="rounded-2xl border" style={{ borderColor: cardLine, background: "rgba(0,0,0,0.35)" }}>
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: cardLine }}>
                  <span className="font-semibold">Office laptops Q3</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(45,212,191,0.12)", color: teal }}>
                    Finalized
                  </span>
                </div>
                <div className="grid gap-3 p-6">
                  {[
                    ["Bid #1", false],
                    ["Bid #2", true],
                    ["Bid #3", false],
                  ].map(([bid, won]) => (
                    <div
                      key={bid as string}
                      className="flex items-center justify-between rounded-xl border px-4 py-3.5"
                      style={{
                        borderColor: won ? "rgba(212,175,106,0.4)" : cardLine,
                        background: won ? "rgba(212,175,106,0.08)" : "transparent",
                      }}
                    >
                      <span className="text-sm font-medium">{bid}</span>
                      <span className="font-mono text-xs" style={{ color: dim }}>
                        {won ? "supplier proven onchain" : "●●●●●●●●●●"}
                      </span>
                      {won ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: gold }}>
                          <BadgeCheck size={14} /> Winner
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: dim }}>
                          <Lock size={12} /> Sealed
                        </span>
                      )}
                    </div>
                  ))}
                  <div className="mt-1 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(45,212,191,0.07)", color: teal }}>
                    <KeyRound size={15} /> Winning price: decryptable by buyer &amp; auditors only
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <Pill>The resolution</Pill>
            <h2 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              FHE gives the ledger a <span style={{ color: gold }}>lock</span>.
            </h2>
            <p className="mt-8 max-w-lg text-lg leading-8" style={{ color: dim }}>
              Fully homomorphic encryption lets the contract compute directly on encrypted bids - compare
              them, rank them, pick the lowest valid one - while the plaintext never exists onchain.
              Verifiable execution, private inputs. The paradox dissolves.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Journey */}
      <Section>
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <Pill>Four steps</Pill>
          <h2 className="max-w-3xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">
            From tender to proven winner.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Publish", "Buyer opens a tender: spec hash, budget cap, deadline. Public and binding."],
              ["02", "Seal", "Approved suppliers encrypt bids in-browser. Ciphertext is all that leaves the device."],
              ["03", "Select", "The contract compares encrypted prices and picks the lowest valid bid."],
              ["04", "Prove", "Winner revealed with a decryption proof. Losing prices stay sealed forever."],
            ].map(([n, title, body]) => (
              <div key={n} className="group rounded-2xl border p-6 backdrop-blur transition hover:-translate-y-1" style={{ borderColor: cardLine, background: cardBg }}>
                <span
                  className="text-sm font-semibold"
                  style={{
                    background: `linear-gradient(90deg, ${teal}, ${gold})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {n}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: dim }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 05 CTA */}
      <Section>
        <Glow color={gold} className="left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="max-w-4xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Open the vault.
            <br />
            <span
              style={{
                background: `linear-gradient(90deg, ${teal}, ${gold})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Keep the secrets.
            </span>
          </h2>
          <Link
            href="#"
            className="mt-12 inline-flex items-center gap-2 rounded-full px-10 py-5 text-lg font-semibold transition hover:opacity-90"
            style={{ background: text, color: bg }}
          >
            Launch workspace <ArrowRight size={18} />
          </Link>
          <p className="mt-6 text-sm" style={{ color: dim }}>No wallet setup. No gas tokens. No seed phrases.</p>
        </div>
        <footer className="relative z-10 flex items-center justify-between pb-2 text-xs" style={{ color: dim }}>
          <span>BlindProcure · sealed with Zama FHE</span>
          <Link href="/design-variants" className="underline underline-offset-4">Back to variants</Link>
        </footer>
      </Section>
    </div>
  );
}
