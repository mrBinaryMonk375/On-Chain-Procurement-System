if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    get() {
      return function(this: bigint) { return this.toString(); };
    }
  });
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Toast } from "@/components/toast";
import { MoneyBackground } from "@/components/money-background";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Procure — On-Chain Procurement System",
  description:
    "Decentralized procurement platform built on Stellar. Create RFPs, place bids, escrow funds, and track everything on-chain with Soroban smart contracts.",
  keywords: ["Stellar", "Soroban", "Procurement", "DApp", "Blockchain", "Smart Contracts"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}>
        <Providers>
          <MoneyBackground />
          <Navbar />
          <main className="pt-28 md:pt-20 min-h-screen">{children}</main>
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
