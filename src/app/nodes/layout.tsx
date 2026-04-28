import type { Metadata } from "next";

const TITLE = "Network Nodes";
const DESCRIPTION =
  "Live view of every Clawglasses Proof-of-Sight mining node, slot utilization, and reward pool health.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nodes" },
  openGraph: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
    url: "/nodes",
  },
  twitter: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
  },
};

export default function NodesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
