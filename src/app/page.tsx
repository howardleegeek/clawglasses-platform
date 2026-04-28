"use client";

import Link from "next/link";
import { PRODUCTS, MOCK_STATS } from "@/lib/constants";

/* ── Hero ──────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 text-center">
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-sight-500/10 blur-[120px]" />
      </div>

      <p className="relative mb-4 inline-block rounded-full border border-sight-500/30 bg-sight-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sight-300">
        Proof-of-Sight Network — Live on Devnet
      </p>
      <h1 className="relative max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
        See the World.{" "}
        <span className="gradient-text">Mine $SIGHT.</span>
      </h1>
      <p className="relative mt-5 max-w-xl text-lg text-white/60">
        Clawglasses are AI-powered smart glasses that double as DePIN mining
        nodes. Wear them, power the network, earn $SIGHT rewards every hour.
      </p>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link href="/purchase" className="btn-primary text-base">
          Buy Clawglasses
        </Link>
        <Link href="/mint" className="btn-secondary text-base">
          Mint NFT Pass
        </Link>
      </div>
    </section>
  );
}

/* ── Proof of Sight ────────────────────────────────── */
function ProofOfSight() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h2 className="mb-4 text-center text-3xl font-bold">
        What is <span className="gradient-text">Proof of Sight</span>?
      </h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-white/60">
        Every Clawglasses device runs on-device AI inference — validating
        real-world visual data to secure the network. Node holders provide
        compute; NFT stakers fund the reward pool and share in mining rewards.
      </p>

      <div className="grid gap-6 sm:grid-cols-3">
        {[
          {
            icon: "👓",
            title: "Wear & Mine",
            desc: "Your glasses run AI tasks automatically. No setup needed — just wear them.",
          },
          {
            icon: "🎫",
            title: "Stake NFT Pass",
            desc: "Mint an NFT Pass with $SIGHT. Stake it on a node to claim a reward slot.",
          },
          {
            icon: "💎",
            title: "Earn $SIGHT",
            desc: "Reward pool distributes $SIGHT every hour to all active stakers.",
          },
        ].map((item) => (
          <div key={item.title} className="card-hover text-center">
            <div className="mb-3 text-4xl">{item.icon}</div>
            <h3 className="mb-1 text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-white/50">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Products ──────────────────────────────────────── */
function Products() {
  const items = Object.entries(PRODUCTS);
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h2 className="mb-12 text-center text-3xl font-bold">Choose Your Clawglasses</h2>
      <div className="grid gap-8 sm:grid-cols-2">
        {items.map(([key, p]) => (
          <div key={key} className="card-hover flex flex-col">
            {/* placeholder image area */}
            <div className="mb-4 flex h-48 items-center justify-center rounded-xl bg-dark-800/50 text-5xl">
              👓
            </div>
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-white/50">{p.description}</p>
            <ul className="mt-4 flex-1 space-y-1">
              {p.specs.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="mt-0.5 text-sight-400">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-end justify-between">
              <span className="text-2xl font-bold">${p.price}</span>
              <Link href="/purchase" className="btn-primary text-sm">
                Buy Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── How It Works ──────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Buy Clawglasses", desc: "Choose WG1 or WG2. Pay with USDC / USDT." },
    { num: "02", title: "Activate Node", desc: "Register your device — it appears as a live node on the network." },
    { num: "03", title: "Mint & Stake NFT", desc: "Mint an NFT Pass with $SIGHT. Stake it on any node with open slots." },
    { num: "04", title: "Earn Rewards", desc: "$SIGHT rewards distribute every hour from the reward pool." },
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-24">
      <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.num} className="card-hover">
            <span className="stat-glow text-3xl font-black">{s.num}</span>
            <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-white/50">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Live Stats Bar ────────────────────────────────── */
function LiveStats() {
  const stats = [
    { label: "Nodes Online", value: MOCK_STATS.nodesOnline },
    { label: "NFTs Minted", value: MOCK_STATS.nftsMinted.toLocaleString() },
    { label: "NFTs Staked", value: MOCK_STATS.nftsStaked.toLocaleString() },
    { label: "$SIGHT Distributed", value: MOCK_STATS.sightDistributed.toLocaleString() },
  ];
  return (
    <section className="border-y border-white/5 bg-dark-900/30">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="stat-glow text-2xl font-bold sm:text-3xl">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/40">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10 text-center text-sm text-white/30">
      <p>&copy; {new Date().getFullYear()} Clawglasses. All rights reserved.</p>
      <p className="mt-1">Powered by Solana &middot; Built with Proof of Sight</p>
    </footer>
  );
}

/* ── Page ──────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProofOfSight />
      <Products />
      <HowItWorks />
      <LiveStats />
      <Footer />
    </>
  );
}
