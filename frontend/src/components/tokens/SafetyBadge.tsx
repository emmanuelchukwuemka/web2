"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from "lucide-react";

interface SafetyResult {
  isHoneypot:  boolean;
  buyTax:      number;
  sellTax:     number;
  isOpenSource:boolean;
  riskLevel:   "safe" | "caution" | "danger" | "unknown";
  flags:       string[];
}

interface GoPlusToken {
  is_honeypot?:  string;
  buy_tax?:      string;
  sell_tax?:     string;
  is_open_source?:string;
}

async function checkSafety(tokenAddress: string, chainId: number): Promise<SafetyResult> {
  // GoPlus only supports mainnet (25); skip for testnet
  if (chainId !== 25) {
    return { isHoneypot: false, buyTax: 0, sellTax: 0, isOpenSource: true, riskLevel: "unknown", flags: [] };
  }

  const res = await fetch(
    `https://api.gopluslabs.io/api/v1/token_security/25?contract_addresses=${tokenAddress}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("GoPlus request failed");

  const json = await res.json() as {
    result?: Record<string, GoPlusToken>;
  };

  const data: GoPlusToken = json.result?.[tokenAddress.toLowerCase()] ?? {};
  const flags: string[] = [];

  const isHoneypot   = data.is_honeypot   === "1";
  const buyTax       = Number(data.buy_tax  ?? 0) * 100;
  const sellTax      = Number(data.sell_tax ?? 0) * 100;
  const isOpenSource = data.is_open_source !== "0";

  if (isHoneypot)     flags.push("Honeypot detected");
  if (buyTax  > 10)   flags.push(`High buy tax (${buyTax.toFixed(0)}%)`);
  if (sellTax > 10)   flags.push(`High sell tax (${sellTax.toFixed(0)}%)`);
  if (!isOpenSource)  flags.push("Contract not verified");

  let riskLevel: SafetyResult["riskLevel"] = "safe";
  if (isHoneypot || sellTax > 50)      riskLevel = "danger";
  else if (flags.length > 0)           riskLevel = "caution";

  return { isHoneypot, buyTax, sellTax, isOpenSource, riskLevel, flags };
}

interface SafetyBadgeProps {
  tokenAddress: string;
  chainId: number;
}

export function SafetyBadge({ tokenAddress, chainId }: SafetyBadgeProps) {
  const [result,  setResult]  = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    checkSafety(tokenAddress, chainId)
      .then(setResult)
      .catch(() => setResult({ isHoneypot: false, buyTax: 0, sellTax: 0, isOpenSource: true, riskLevel: "unknown", flags: [] }))
      .finally(() => setLoading(false));
  }, [tokenAddress, chainId]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
        <Shield size={11} className="animate-pulse" />
        Checking…
      </div>
    );
  }

  if (!result || result.riskLevel === "unknown") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
        <Shield size={11} />
        Unaudited
      </div>
    );
  }

  const config = {
    safe:    { icon: ShieldCheck, color: "text-accent-green",  border: "border-accent-green/30",  bg: "bg-accent-green/5",  label: "Safe" },
    caution: { icon: ShieldAlert, color: "text-accent-amber",  border: "border-accent-amber/30",  bg: "bg-accent-amber/5",  label: "Caution" },
    danger:  { icon: ShieldX,     color: "text-accent-red",    border: "border-accent-red/30",    bg: "bg-accent-red/5",    label: "High Risk" },
    unknown: { icon: Shield,      color: "text-text-muted",    border: "border-border",            bg: "bg-bg-elevated",     label: "Unknown" },
  }[result.riskLevel];

  const Icon = config.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${config.color} ${config.border} ${config.bg}`}
      >
        <Icon size={11} />
        {config.label}
      </button>

      {open && (
        <div className={`absolute top-7 left-0 z-20 w-52 rounded-xl border shadow-card p-3 text-xs space-y-2 ${config.border} ${config.bg} bg-bg-elevated`}>
          <p className="font-semibold text-text-primary">GoPlus Security Check</p>
          {result.flags.length === 0 ? (
            <p className="text-accent-green">No issues detected</p>
          ) : (
            <ul className="space-y-1">
              {result.flags.map((f) => (
                <li key={f} className="flex items-center gap-1 text-accent-amber">
                  <span>•</span> {f}
                </li>
              ))}
            </ul>
          )}
          <div className="pt-1 border-t border-border space-y-0.5 text-text-muted">
            <p>Buy tax: {result.buyTax.toFixed(1)}%</p>
            <p>Sell tax: {result.sellTax.toFixed(1)}%</p>
            <p>Verified: {result.isOpenSource ? "Yes" : "No"}</p>
          </div>
          <p className="text-text-muted/60 text-[10px]">Powered by GoPlus Security</p>
        </div>
      )}
    </div>
  );
}