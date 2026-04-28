import type { Metadata } from "next";

const TITLE = "Mint NFT Pass";
const DESCRIPTION =
  "Mint a Proof-of-Sight NFT Pass with $SIGHT, then stake it on a Clawglasses node to earn hourly rewards.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/mint" },
  openGraph: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
    url: "/mint",
  },
  twitter: {
    title: `${TITLE} — Clawglasses`,
    description: DESCRIPTION,
  },
};

export default function MintLayout({ children }: { children: React.ReactNode }) {
  return children;
}
