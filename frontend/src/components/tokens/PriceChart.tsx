"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useState } from "react";
import { cn, formatCRO } from "@/lib/utils";
import { fetchChart } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { formatEther } from "viem";

type Interval = "5m" | "1h" | "1d";

const INTERVALS: { key: Interval; label: string }[] = [
  { key: "5m",  label: "5M"  },
  { key: "1h",  label: "1H"  },
  { key: "1d",  label: "1D"  },
];

interface PriceChartProps {
  tokenAddress: string;
}

function formatAxisPrice(weiStr: string): string {
  try {
    const n = Number(formatEther(BigInt(weiStr)));
    if (n === 0) return "0";
    if (n < 0.0001) return n.toExponential(1);
    return n.toFixed(4);
  } catch {
    return weiStr;
  }
}

export function PriceChart({ tokenAddress }: PriceChartProps) {
  const [interval, setInterval] = useState<Interval>("5m");

  const { data: candles = [], isLoading } = useQuery({
    queryKey: ["chart", tokenAddress, interval],
    queryFn:  () => fetchChart(tokenAddress, interval),
    refetchInterval: 30_000,
  });

  const chartData = candles.map((c) => ({
    time:  new Date(c.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    close: Number(formatEther(BigInt(c.close))),
    volume: Number(formatEther(BigInt(c.volume))),
  }));

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-text-primary">Price Chart</h3>
        <div className="flex rounded-lg border border-border bg-bg-elevated p-0.5 gap-0.5">
          {INTERVALS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setInterval(key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all",
                interval === key
                  ? "bg-accent-purple/20 text-accent-purple-light"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex h-52 items-center justify-center">
          <Spinner />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-52 items-center justify-center">
          <p className="text-sm text-text-muted">No trade data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4D" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisPrice}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0D1220",
                border: "1px solid #1E2D4D",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#94A3B8" }}
              itemStyle={{ color: "#A78BFA" }}
              formatter={(v: number) => [`${v.toFixed(6)} CRO`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#A78BFA" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}