import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { ArrowRight, ChevronDown, Lock, ShieldCheck, Terminal } from "lucide-react";

const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = { title: "Variant 2 · Cipher" };

/* Design variant mockup: "Cipher" - cryptographic terminal.
   Static preview only. Not wired to contract/auth. */

const bg = "#0a0f0e";
const panel = "#0f1614";
const line = "#1e2b28";
const green = "#4ade80";
const dim = "#5c6f6a";
const text = "#d7e2df";

const cipherRow = "8f2a c41e 09b7 e3d1 5a6f 77c2 1b90 fd44";

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <span>
      <span style={{ color: green }}>❯</span> {children}
    </span>
  );
}

function Section({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="flex min-h-screen snap-start flex-col justify-center px-6 py-20 sm:px-12 lg:px-20">
      {children}
    </section>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-8 text-xs uppercase tracking-[0.35em]" style={{ color: green }}>
      {"// "}{children}
    </p>
  );
}

export default function Variant2() {
  return (
    <div className={`${plexMono.className} h-screen snap-y snap-mandatory overflow-y-auto scroll-smooth text-[15px]`} style={{ background: bg, color: text }}>
      {/* 01 Hero */}
      <section className="relative flex min-h-screen snap-start flex-col px-6 sm:px-12 lg:px-20">
        {/* scanline grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            opacity: 0.35,
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          }}
        />
        <header className="relative flex items-center justify-between border-b py-4" style={{ borderColor: line }}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} style={{ color: green }} /> blindprocure
          </span>
          <span className="text-xs" style={{ color: dim }}>
            [ zama:fhevm ] [ net:sepolia ] [ status:live ]
          </span>
        </header>
        <div className="relative flex flex-1 flex-col justify-center">
          <p className="mb-6 text-sm" style={{ color: dim }}>
            <Prompt>procurement --sealed --verifiable</Prompt>
          </p>
          <h1 className="max-w-5xl text-4xl font-semibold leading-[1.15] sm:text-5xl lg:text-6xl">
            The contract picks the winner.
            <br />
            <span style={{ color: green }}>It never reads the bids.</span>
          </h1>
          <p className="mt-8 max-w-2xl leading-7" style={{ color: dim }}>
            Sealed-bid tenders on Ethereum. Prices are encrypted client-side, compared homomorphically
            onchain, and the losing numbers are never decryptable. By anyone. Ever.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="#"
              className="inline-flex items-center gap-2 border px-6 py-3 text-sm font-semibold transition hover:translate-x-1"
              style={{ borderColor: green, color: green, background: "rgba(74,222,128,0.08)" }}
            >
              ./launch-workspace <ArrowRight size={15} />
            </Link>
            <span className="text-xs" style={{ color: dim }}>auth: email | google · gas: sponsored</span>
          </div>
        </div>
        <div className="relative flex items-center gap-2 border-t py-4 text-xs" style={{ borderColor: line, color: dim }}>
          <ChevronDown size={14} className="animate-bounce" style={{ color: green }} />
          scroll: 01/05 - why chains leak
        </div>
      </section>

      {/* 02 Problem */}
      <Section>
        <SectionTag>01 - the leak</SectionTag>
        <h2 className="max-w-4xl text-3xl font-semibold leading-snug sm:text-4xl lg:text-5xl">
          Blockchains solved trust.
          <br />
          <span style={{ color: "#f87171" }}>They broke secrecy doing it.</span>
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 border p-6" style={{ borderColor: line, background: panel }}>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: dim }}>
              <Terminal size={13} /> open bidding, public chain
            </div>
            <pre className="overflow-x-auto text-sm leading-7">
              <code>
                <span style={{ color: dim }}>$ cast call tender.bids(1)</span>{"\n"}
                supplier_a  <span style={{ color: "#f87171" }}>1200</span>  <span style={{ color: dim }}>← visible to rivals</span>{"\n"}
                supplier_b  <span style={{ color: "#f87171" }}>980</span>   <span style={{ color: dim }}>← visible to rivals</span>{"\n"}
                supplier_c  <span style={{ color: "#f87171" }}>1100</span>  <span style={{ color: dim }}>← visible to rivals</span>{"\n\n"}
                <span style={{ color: "#f87171" }}>» every price is public infrastructure.</span>
              </code>
            </pre>
          </div>
          <div className="min-w-0 flex flex-col justify-center gap-5 leading-7" style={{ color: dim }}>
            <p>
              <span style={{ color: text }}>Verifiability without privacy is surveillance.</span> A public
              ledger proves the award was fair - and hands your pricing strategy to every competitor with
              a block explorer.
            </p>
            <p>
              That is why serious procurement never moved onchain: the audit trail was worth less than
              the secrets it burned.
            </p>
          </div>
        </div>
      </Section>

      {/* 03 Solution */}
      <Section>
        <SectionTag>02 - the fix</SectionTag>
        <h2 className="max-w-4xl text-3xl font-semibold leading-snug sm:text-4xl lg:text-5xl">
          FHE: the chain computes on ciphertext.
          <br />
          <span style={{ color: green }}>Verifiable AND private.</span>
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 border p-6" style={{ borderColor: green, background: panel }}>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: green }}>
              <Lock size={13} /> sealed bidding, same chain
            </div>
            <pre className="overflow-x-auto text-sm leading-7">
              <code>
                <span style={{ color: dim }}>$ cast call tender.bids(1)</span>{"\n"}
                supplier_a  <span style={{ color: green }}>{cipherRow.slice(0, 19)}…</span>{"\n"}
                supplier_b  <span style={{ color: green }}>e3d1 5a6f 77c2 1b90…</span>{"\n"}
                supplier_c  <span style={{ color: green }}>fd44 8f2a c41e 09b7…</span>{"\n\n"}
                <span style={{ color: dim }}>$ tender.finalize()</span>{"\n"}
                <span style={{ color: green }}>» winner: supplier_b [proof ✓] price: [sealed]</span>
              </code>
            </pre>
          </div>
          <div className="min-w-0 flex flex-col justify-center gap-5 leading-7" style={{ color: dim }}>
            <p>
              <span style={{ color: text }}>Fully homomorphic encryption</span> lets the contract run{" "}
              <span style={{ color: green }}>min()</span> over encrypted integers. It selects the lowest
              valid bid under the public budget cap without decrypting anything.
            </p>
            <p>
              The blockchain keeps its superpower - anyone can verify the selection happened by the
              rules. FHE adds the one it was missing: the inputs stay secret.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 Pipeline */}
      <Section>
        <SectionTag>03 - the pipeline</SectionTag>
        <div className="grid gap-px lg:grid-cols-4" style={{ background: line }}>
          {[
            ["encrypt()", "Supplier types a price. It becomes ciphertext in the browser - before any network call."],
            ["submit()", "Only the encrypted value and a validity proof travel onchain. Gas is sponsored."],
            ["finalize()", "The contract compares ciphertexts homomorphically. Lowest valid bid wins."],
            ["prove()", "Winner identity decrypts publicly with a KMS proof. Losing bids stay sealed forever."],
          ].map(([fn, body], i) => (
            <div key={fn} className="flex min-h-60 flex-col p-6" style={{ background: panel }}>
              <span className="text-xs" style={{ color: dim }}>step 0{i + 1}</span>
              <h3 className="mt-3 text-xl font-semibold" style={{ color: green }}>{fn}</h3>
              <p className="mt-3 text-sm leading-6" style={{ color: dim }}>{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm" style={{ color: dim }}>
          <Prompt>
            trust_required: <span style={{ color: green }}>0</span> · plaintext_exposed:{" "}
            <span style={{ color: green }}>winner_only</span> · audit_trail:{" "}
            <span style={{ color: green }}>complete</span>
          </Prompt>
        </p>
      </Section>

      {/* 05 CTA */}
      <Section>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="mb-6 text-sm" style={{ color: dim }}>
            <Prompt>init --first-tender</Prompt>
          </p>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Deploy a tender.
            <br />
            <span style={{ color: green }}>Leak nothing.</span>
          </h2>
          <Link
            href="#"
            className="mt-10 inline-flex items-center gap-2 border px-8 py-4 font-semibold transition hover:translate-x-1"
            style={{ borderColor: green, color: bg, background: green }}
          >
            ./launch-workspace <ArrowRight size={16} />
          </Link>
          <p className="mt-6 text-xs" style={{ color: dim }}>no wallet setup · no gas tokens · no seed phrases</p>
        </div>
        <footer className="flex items-center justify-between border-t pt-4 text-xs" style={{ borderColor: line, color: dim }}>
          <span>blindprocure © sealed with zama fhe</span>
          <Link href="/design-variants" className="underline underline-offset-4">back to variants</Link>
        </footer>
      </Section>
    </div>
  );
}
