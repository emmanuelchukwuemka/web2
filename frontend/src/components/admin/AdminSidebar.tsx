"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Zap, Coins, Shield, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",          label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/settings", label: "Platform Settings", icon: Settings     },
  { href: "/admin/tokens",   label: "Token Factory", icon: Zap             },
  { href: "/admin/staking",     label: "Staking",     icon: Coins       },
  { href: "/admin/moderation",  label: "Moderation",  icon: ShieldAlert },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg-card">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-red/10">
          <Shield size={14} className="text-accent-red" />
        </div>
        <span className="text-sm font-semibold text-text-primary">Admin Panel</span>
      </div>

      {/* Nav */}
      <nav className="p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent-purple/10 text-accent-purple-light"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Warning banner */}
      <div className="absolute bottom-20 left-0 w-56 px-3">
        <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 px-3 py-2.5 text-xs text-accent-red">
          <p className="font-medium mb-0.5">Owner-only zone</p>
          <p className="text-accent-red/70">All actions affect live contracts.</p>
        </div>
      </div>
    </aside>
  );
}