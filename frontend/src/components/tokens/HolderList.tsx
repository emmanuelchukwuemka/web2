"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { shortAddress, explorerAddress } from "@/lib/utils";
import { fetchHolders } from "@/lib/api";

interface HolderListProps {
  tokenAddress: string;
  totalSupply?: bigint;
}

export function HolderList({ tokenAddress, totalSupply }: HolderListProps) {
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const { data, isLoading, isFetching } = useQuery({
    queryKey:        ["holders", tokenAddress, page],
    queryFn:         () => fetchHolders(tokenAddress, { page, limit: LIMIT }),
    refetchInterval: 30_000,
  });

  const supply = totalSupply ?? BigInt("1000000000000000000000000000"); // 1B with 18 decimals default

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-text-muted">
        <Users size={32} className="opacity-30" />
        <p className="text-sm">No holders yet</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / LIMIT);

  return (
    <div className="space-y-0">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-text-muted border-b border-border">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-5">Holder</div>
        <div className="col-span-3 text-right">Balance</div>
        <div className="col-span-3 text-right">% Supply</div>
      </div>

      {data.data.map((h, i) => {
        const bal  = BigInt(h.balance);
        const pct  = supply > 0n ? Number((bal * 10000n) / supply) / 100 : 0;
        const rank = (page - 1) * LIMIT + i + 1;

        return (
          <div
            key={h.holder}
            className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-bg-elevated transition-colors"
          >
            <div className="col-span-1 text-center text-text-muted">{rank}</div>
            <div className="col-span-5">
              <a
                href={explorerAddress(h.holder)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-accent-purple-light hover:underline"
              >
                {shortAddress(h.holder)}
              </a>
            </div>
            <div className="col-span-3 text-right text-text-primary font-medium">
              {Number(formatEther(bal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="col-span-3 text-right">
              <span className={pct > 10 ? "text-accent-amber" : "text-text-muted"}>
                {pct.toFixed(2)}%
              </span>
              {/* mini bar */}
              <div className="mt-0.5 h-1 w-full rounded-full bg-bg-primary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-purple/60"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-xs text-text-muted">{data.total} holders total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-xs text-text-muted self-center">{page} / {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}