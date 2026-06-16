import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatEther, formatUnits } from "viem";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatCRO(wei: bigint | string, decimals = 4): string {
  const n = typeof wei === "string" ? BigInt(wei) : wei;
  const eth = Number(formatEther(n));
  if (eth === 0) return "0";
  if (eth < 0.0001) return "<0.0001";
  if (eth >= 1_000_000) return `${(eth / 1_000_000).toFixed(2)}M`;
  if (eth >= 1_000)     return `${(eth / 1_000).toFixed(2)}K`;
  return eth.toFixed(decimals);
}

export function formatTokenAmount(wei: bigint | string): string {
  const n = typeof wei === "string" ? BigInt(wei) : wei;
  const amount = Number(formatUnits(n, 18));
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000)         return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatPrice(weiPerToken: bigint | string): string {
  const n = typeof weiPerToken === "string" ? BigInt(weiPerToken) : weiPerToken;
  // Price is CRO per token in 18-decimal fixed point
  const price = Number(formatEther(n));
  if (price === 0) return "$0";
  if (price < 0.000001) return `${price.toExponential(2)} CRO`;
  if (price < 0.01)     return `${price.toFixed(6)} CRO`;
  return `${price.toFixed(4)} CRO`;
}

export function formatMarketCap(priceWei: string, supplyWei = "1000000000000000000000000000"): string {
  try {
    const price = Number(formatEther(BigInt(priceWei)));
    const supply = Number(formatEther(BigInt(supplyWei)));
    const mc = price * supply;
    if (mc >= 1_000_000) return `${(mc / 1_000_000).toFixed(2)}M CRO`;
    if (mc >= 1_000)     return `${(mc / 1_000).toFixed(2)}K CRO`;
    return `${mc.toFixed(2)} CRO`;
  } catch {
    return "—";
  }
}

export function formatProgress(realCroRaisedWei: string, thresholdWei = "500000000000000000000"): number {
  try {
    const raised = Number(formatEther(BigInt(realCroRaisedWei)));
    const threshold = Number(formatEther(BigInt(thresholdWei)));
    return Math.min(100, (raised / threshold) * 100);
  } catch {
    return 0;
  }
}

// ── Address formatting ────────────────────────────────────────────────────────

export function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function explorerTx(hash: string, testnet = true): string {
  const base = testnet ? "https://testnet.cronoscan.com" : "https://cronoscan.com";
  return `${base}/tx/${hash}`;
}

export function explorerAddress(address: string, testnet = true): string {
  const base = testnet ? "https://testnet.cronoscan.com" : "https://cronoscan.com";
  return `${base}/address/${address}`;
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function timeAgo(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}