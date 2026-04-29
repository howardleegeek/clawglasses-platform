// SEO + Open Graph metadata.
//
// NOTE: This metadata references /og-image.png (1200x630). That asset is NOT
// yet committed to /public — it must be added separately for previews on
// Twitter / iMessage / LinkedIn / Slack to render with a real image. Until
// then social platforms will fall back to a text-only card. Do NOT generate
// a placeholder; ship the real asset when design hands it off.
//
// metadataBase resolves relative OG URLs in production. Set
// NEXT_PUBLIC_SITE_URL on Vercel (e.g. https://clawglasses.com) to override
// the default. Without it, Next emits a build warning and previews still work.
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://clawglasses.com";
const SITE_NAME = "Clawglasses";
const SITE_DESCRIPTION =
  "Clawglasses are AI-powered smart glasses that double as Proof-of-Sight DePIN mining nodes. Wear them, power the network, and earn $SIGHT rewards every hour.";
const OG_IMAGE = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Clawglasses — AI Smart Glasses x DePIN Network",
    template: "%s — Clawglasses",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Clawglasses",
    "AI smart glasses",
    "DePIN",
    "Proof of Sight",
    "$SIGHT",
    "Solana",
    "smart glasses mining",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Clawglasses — AI Smart Glasses x DePIN Network",
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Clawglasses — Proof-of-Sight DePIN network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawglasses — AI Smart Glasses x DePIN Network",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
    creator: "@ClawGlasses",
    site: "@ClawGlasses",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Schema.org JSON-LD. Two schemas:
//   - Organization: company metadata for Knowledge Graph eligibility.
//   - WebSite: property metadata. SearchAction omitted (no site search yet
//     — Google penalizes broken sitelinks search box markup).
//
// Brand-independence iron law: sameAs lists only Clawglasses-owned handles.
//
// We render the JSON via React's <script>{string}</script> children pattern
// (NOT dangerouslySetInnerHTML). The payload is JSON.stringify of a hardcoded
// const, no user-input path → no XSS surface. JSON-LD never contains '<' or
// '>' inside string values, so React's character escaping doesn't corrupt it.
const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}${OG_IMAGE}`,
  description: SITE_DESCRIPTION,
  sameAs: ["https://twitter.com/ClawGlasses"],
});

const WEBSITE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en-US",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* Two separate JSON-LD blocks so a parser failure on one doesn't
            sink the other. Each is a hardcoded const stringified at build. */}
        <script type="application/ld+json">{ORG_JSON_LD}</script>
        <script type="application/ld+json">{WEBSITE_JSON_LD}</script>
        {/* Honest preview banner — visible everywhere. Honest about state, defuses
            "this is misrepresenting itself as production" framing.
            R1 (2026-04-28): banner stays at the *root* level. <WalletProvider> moved
            into src/app/(wallet)/layout.tsx so non-wallet routes (/, /nodes) no longer
            ship the @solana/wallet-adapter package. The banner, Navbar, and JSON-LD
            still wrap every route. */}
        <div className="border-b border-amber-500/20 bg-amber-500/[0.04] text-amber-100">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="font-medium">Closed alpha · 演示阶段</span>
            <span className="text-amber-200/60 hidden sm:inline">·</span>
            <span className="text-amber-200/80 hidden sm:inline">
              Numbers shown are demonstrative. On-chain program not yet deployed; no real value moves.
            </span>
          </div>
        </div>
        <Navbar />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
