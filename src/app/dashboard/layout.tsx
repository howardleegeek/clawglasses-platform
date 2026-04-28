import type { Metadata } from "next";

const TITLE = "My Dashboard";
const DESCRIPTION =
  "Track your Clawglasses NFT Passes, staked nodes, and $SIGHT mining rewards in one place.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/dashboard" },
  openGraph: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
    url: "/dashboard",
  },
  twitter: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
