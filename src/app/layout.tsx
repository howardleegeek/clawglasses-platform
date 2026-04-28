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
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
