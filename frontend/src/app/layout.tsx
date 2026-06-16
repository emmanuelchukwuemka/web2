import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "N.W.O Launchpad — Launch on Cronos",
  description: "The premier token & NFT launchpad on Cronos. Launch, trade, and earn with the N.W.O ecosystem.",
  openGraph: {
    title: "N.W.O Launchpad",
    description: "Launch tokens & NFTs on Cronos with bonding curves.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}