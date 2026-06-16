"use client";

import { useState } from "react";
import { BarChart2, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriceChart } from "./PriceChart";
import { TradeHistory } from "./TradeHistory";
import { HolderList } from "./HolderList";
import { Comments } from "./Comments";

type Tab = "chart" | "holders" | "comments";

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "chart",    label: "Chart & Trades", icon: BarChart2     },
  { id: "holders",  label: "Holders",        icon: Users         },
  { id: "comments", label: "Comments",       icon: MessageSquare },
];

interface TokenTabsProps {
  tokenAddress: string;
}

export function TokenTabs({ tokenAddress }: TokenTabsProps) {
  const [active, setActive] = useState<Tab>("chart");

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex rounded-xl border border-border bg-bg-card p-1 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              active === id
                ? "bg-accent-purple/10 text-accent-purple-light"
                : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === "chart" && (
        <div className="space-y-6">
          <PriceChart tokenAddress={tokenAddress} />
          <TradeHistory tokenAddress={tokenAddress} />
        </div>
      )}

      {active === "holders" && (
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-text-primary text-sm">Top Holders</h2>
          </div>
          <HolderList tokenAddress={tokenAddress} />
        </div>
      )}

      {active === "comments" && (
        <div className="rounded-xl border border-border bg-bg-card p-5">
          <h2 className="font-semibold text-text-primary text-sm mb-4">Community</h2>
          <Comments tokenAddress={tokenAddress} />
        </div>
      )}
    </div>
  );
}