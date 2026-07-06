import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Design variants" };

/* Internal design-exploration index. Not linked from app navigation. */

const variants = [
  {
    href: "/design-variants/variant-1",
    name: "1 · Ledger",
    vibe: "Editorial institutional. A procurement journal: serif display type, paper & ink, hairline rules, roman-numeral sections.",
    colors: ["#f7f3ea", "#141210", "#0e6b60"],
  },
  {
    href: "/design-variants/variant-2",
    name: "2 · Cipher",
    vibe: "Cryptographic terminal. Dark green-on-black, monospace, fake cast-call panels showing plaintext leak vs sealed ciphertext.",
    colors: ["#0a0f0e", "#4ade80", "#d7e2df"],
  },
  {
    href: "/design-variants/variant-3",
    name: "3 · Vault",
    vibe: "Premium dark fintech. Near-black, teal-to-gold gradients, glass cards, soft glows. The 'serious money product' register.",
    colors: ["#07090f", "#2dd4bf", "#d4af6a"],
  },
  {
    href: "/design-variants/variant-4",
    name: "4 · Signal",
    vibe: "Brutalist modernist poster. Massive black uppercase type, thick borders, acid-green blocks, unapologetic and loud.",
    colors: ["#f2f2ee", "#111111", "#c8f542"],
  },
];

export default function DesignVariantsIndex() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16">
      <p className="mono text-xs uppercase tracking-wide text-[var(--muted)]">Internal · design exploration</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Landing page redesign variants</h1>
      <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
        Four distinct directions, each a full-viewport snap-scroll landing: hero, problem
        (verifiability without privacy), solution (FHE adds the lock), protocol, CTA. Static mockups -
        the live app is untouched.
      </p>
      <div className="mt-10 grid gap-4">
        {variants.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className="group flex items-center gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--accent)] hover:shadow-sm"
          >
            <span className="flex shrink-0 -space-x-1.5">
              {v.colors.map((c) => (
                <span key={c} className="h-8 w-8 rounded-full border-2 border-[var(--panel)]" style={{ background: c }} />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{v.name}</span>
              <span className="mt-0.5 block text-sm leading-6 text-[var(--muted)]">{v.vibe}</span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-[var(--muted)] transition group-hover:text-[var(--accent)]" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-[var(--muted)]">
        Pick one and we implement it properly across the landing page and app shell.
      </p>
    </main>
  );
}
