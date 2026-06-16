"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Layers, Image as ImageIcon, Coins, Menu, X, Shield } from "lucide-react";
import { CONTROLLER_ABI, ADDRESSES } from "@/lib/contracts";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/",       label: "Home",    icon: Layers    },
  { href: "/tokens", label: "Tokens",  icon: Zap       },
  { href: "/nfts",   label: "NFTs",    icon: ImageIcon },
  { href: "/staking",label: "Staking", icon: Coins     },
] as const;


function useIsOwner() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address:      ADDRESSES.controller,
    abi:          CONTROLLER_ABI,
    functionName: "owner",
    query:        { enabled: !!ADDRESSES.controller && !!address },
  });
  return !!address && !!owner &&
    address.toLowerCase() === (owner as string).toLowerCase();
}

export function Navbar() {
  const pathname    = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOwner     = useIsOwner();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 glass">
      <div className="page-container flex h-16 items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple shadow-glow-sm">
            <Layers className="h-4.5 w-4.5 text-white" size={18} />
          </div>
          <span className="text-lg font-bold gradient-text">N.W.O</span>
          <span className="hidden text-sm font-medium text-text-muted sm:block">Launchpad</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                (href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "bg-accent-purple/10 text-accent-purple-light"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}

          {/* Admin link — only shown to the contract owner */}
          {isOwner && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-accent-red/10 text-accent-red"
                  : "text-text-muted hover:text-accent-red hover:bg-accent-red/5"
              )}
            >
              <Shield size={15} />
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/launch" className="hidden sm:block">
            <Button size="sm" variant="secondary" className="gap-1.5">
              <Zap size={14} className="text-accent-purple" />
              Launch Token
            </Button>
          </Link>
          <ConnectModal />

          {/* Mobile menu toggle */}
          <button
            className="md:hidden rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg-card animate-fade-in">
          <nav className="page-container flex flex-col gap-1 py-3">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  (href === "/" ? pathname === "/" : pathname.startsWith(href))
                    ? "bg-accent-purple/10 text-accent-purple-light"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <Link
              href="/launch"
              onClick={() => setMobileOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-accent-purple hover:bg-accent-purple/10 transition-colors"
            >
              <Zap size={16} />
              Launch Token
            </Link>
            {isOwner && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-accent-red hover:bg-accent-red/5 transition-colors"
              >
                <Shield size={16} />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}