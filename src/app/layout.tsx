import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/providers/WalletProvider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Clawglasses — AI Smart Glasses × DePIN Network",
  description:
    "Mine $SIGHT rewards by powering the Proof-of-Sight network with Clawglasses AI smart glasses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <WalletProvider>
          {/* Honest preview banner — visible everywhere. Honest about state, defuses
              "this is misrepresenting itself as production" framing. */}
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
        </WalletProvider>
      </body>
    </html>
  );
}
