import type { Metadata } from "next";

const TITLE = "Buy Clawglasses";
const DESCRIPTION =
  "Purchase Clawglasses AI smart glasses with USDC or USDT. Each device ships as a live Proof-of-Sight mining node.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/purchase" },
  openGraph: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
    url: "/purchase",
  },
  twitter: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
  },
};

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
