import Link from "next/link";
import { Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-card mt-16">
      <div className="page-container py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-purple/20">
            <Layers size={14} className="text-accent-purple-light" />
          </div>
          <span className="text-sm font-semibold text-text-primary">N.W.O Launchpad</span>
          <span className="text-xs text-text-muted">on Cronos</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-text-muted">
          <Link href="/tokens"  className="hover:text-text-primary transition-colors">Tokens</Link>
          <Link href="/nfts"    className="hover:text-text-primary transition-colors">NFTs</Link>
          <Link href="/staking" className="hover:text-text-primary transition-colors">Staking</Link>
          <Link href="/launch"  className="hover:text-text-primary transition-colors">Launch</Link>
        </div>

        <p className="text-xs text-text-muted">
          &copy; {new Date().getFullYear()} N.W.O Launchpad. All rights reserved.
        </p>
      </div>
    </footer>
  );
}