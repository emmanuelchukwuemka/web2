"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { fetchTrades } from "@/lib/api";
import { formatCRO, formatTokenAmount, shortAddress, explorerTx, timeAgo } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface TradeHistoryProps {
  tokenAddress: string;
}

export function TradeHistory({ tokenAddress }: TradeHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["trades", tokenAddress],
    queryFn: () => fetchTrades(tokenAddress, { limit: 50 }),
    refetchInterval: 10_000,
  });

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
        <span className="text-xs text-text-muted">{data?.total ?? 0} trades</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner />
        </div>
      ) : (data?.data.length ?? 0) === 0 ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-text-muted">No trades yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-right">Tokens</th>
                <th className="px-5 py-3 text-right">CRO</th>
                <th className="px-5 py-3 text-left hidden sm:table-cell">Trader</th>
                <th className="px-5 py-3 text-right hidden md:table-cell">Time</th>
                <th className="px-3 py-3 text-center">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.data.map((trade) => (
                <tr key={trade.id} className="hover:bg-bg-elevated transition-colors">
                  <td className="px-5 py-3">
                    <span className={trade.isBuy ? "pill-buy" : "pill-sell"}>
                      {trade.isBuy
                        ? <ArrowUpRight size={11} />
                        : <ArrowDownRight size={11} />}
                      {trade.isBuy ? "Buy" : "Sell"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-text-primary">
                    {formatTokenAmount(trade.tokenAmount)}
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${trade.isBuy ? "text-accent-red" : "text-accent-green"}`}>
                    {formatCRO(trade.croAmount)}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="text-text-muted font-mono text-xs">{shortAddress(trade.trader)}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted hidden md:table-cell">
                    {timeAgo(trade.timestamp)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <a
                      href={explorerTx(trade.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-accent-purple-light transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}