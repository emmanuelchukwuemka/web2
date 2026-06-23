"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { ConnectModal } from "@/components/wallet/ConnectModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Image as ImageIcon, Coins, Menu, X, Shield, TrendingUp, Home } from "lucide-react";
import { CONTROLLER_ABI, ADDRESSES } from "@/lib/contracts";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/",        label: "Home",    icon: Home       },
  { href: "/tokens",  label: "Tokens",  icon: TrendingUp },
  { href: "/nfts",    label: "NFTs",    icon: ImageIcon  },
  { href: "/staking", label: "Staking", icon: Coins      },
] as const;

function useIsOwner() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address:      ADDRESSES.controller,
    abi:          CONTROLLER_ABI,
    functionName: "owner",
    query:        { enabled: !!ADDRESSES.controller && !!address },
  });
  return !!address && !!owner && address.toLowerCase() === (owner as string).toLowerCase();
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0 group">
      {/* Wolf emblem */}
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-dark to-gold border border-gold/30 shadow-gold-sm group-hover:shadow-gold transition-all duration-300">
        <span className="text-black font-black text-sm tracking-tighter">N</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-black tracking-tighter gradient-text">N.W.O</span>
        <span className="text-[10px] font-medium text-text-muted tracking-widest uppercase">Launchpad</span>
      </div>
    </Link>
  );
}

export function Navbar() {
  const pathname   = usePathname();
  const [open, setOpen] = useState(false);
  const isOwner    = useIsOwner();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full glass">
      <div className="page-container flex h-16 items-center justify-between gap-6">

        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
                isActive(href)
                  ? "bg-gold/10 text-gold border border-gold/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "bg-accent-red/10 text-accent-red border border-accent-red/20"
                  : "text-text-muted hover:text-accent-red hover:bg-accent-red/5"
              )}
            >
              <Shield size={14} />
              Admin
            </Link>
          )}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Link href="/launch" className="hidden sm:block">
            <Button size="sm" className="gap-1.5 text-xs font-bold">
              <Zap size={13} />
              Launch Token
            </Button>
          </Link>

          <ConnectModal />

          {/* Mobile toggle */}
          <button
            className="md:hidden rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-border/50 bg-bg-surface animate-slide-down">
          <nav className="page-container flex flex-col gap-1 py-3">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive(href)
                    ? "bg-gold/10 text-gold border border-gold/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <Link
              href="/launch"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-gold-dark to-gold px-4 py-3 text-sm font-bold text-black"
            >
              <Zap size={16} />
              Launch Token
            </Link>
            {isOwner && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-accent-red hover:bg-accent-red/5 transition-colors"
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