"use client";

import { useState } from "react";
import { isAddress } from "viem";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Zap, RefreshCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TOKEN_FACTORY_ADMIN_ABI, ADDRESSES } from "@/lib/contracts";
import { fetchTokens } from "@/lib/api";
import { shortAddress, explorerAddress, timeAgo, formatCRO } from "@/lib/utils";
import Link from "next/link";

export default function AdminTokensPage() {
  const [newImpl, setNewImpl] = useState("");
  const [error,   setError]   = useState("");

  const { data: reads, isLoading } = useReadContracts({
    contracts: [
      { address: ADDRESSES.tokenFactory, abi: TOKEN_FACTORY_ADMIN_ABI, functionName: "curveImplementation" },
      { address: ADDRESSES.tokenFactory, abi: TOKEN_FACTORY_ADMIN_ABI, functionName: "totalTokens"         },
      { address: ADDRESSES.tokenFactory, abi: TOKEN_FACTORY_ADMIN_ABI, functionName: "owner"               },
    ],
    query: { enabled: !!ADDRESSES.tokenFactory },
  });

  const [curveImpl, totalTokens, factoryOwner] = reads?.map((r) => r.result) ?? [];

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Recent tokens
  const { data: tokensData, isLoading: tokensLoading } = useQuery({
    queryKey: ["admin-tokens"],
    queryFn:  () => fetchTokens({ limit: 20, sort: "createdAt", order: "desc" }),
  });

  function handleUpdateImpl() {
    setError("");
    if (!isAddress(newImpl)) return setError("Invalid address");
    writeContract({
      address:      ADDRESSES.tokenFactory,
      abi:          TOKEN_FACTORY_ADMIN_ABI,
      functionName: "setCurveImplementation",
      args:         [newImpl as `0x${string}`],
    });
  }

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Token Factory</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage the bonding curve clone factory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tokens", value: totalTokens?.toString() ?? "—" },
          { label: "Factory Owner", value: factoryOwner ? shortAddress(factoryOwner as string) : "—" },
          { label: "Curve Impl",    value: curveImpl    ? shortAddress(curveImpl    as string) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-sm font-bold text-text-primary font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Update curve implementation */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <RefreshCw size={15} className="text-accent-purple" />
          <h2 className="font-semibold text-text-primary text-sm">Update Curve Implementation</h2>
        </div>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm">
            <p className="text-text-muted text-xs mb-0.5">Current implementation</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-text-primary">
                {(curveImpl as string | undefined) ?? "—"}
              </span>
              {curveImpl && (
                <a
                  href={explorerAddress(curveImpl as string)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-text-muted hover:text-accent-purple-light transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 px-4 py-3 text-xs text-accent-amber">
            <p className="font-medium mb-0.5">Caution</p>
            <p>Changing the implementation affects all future clones. Existing curves are unaffected (they already point to the old impl). Only update after thorough auditing of the new contract.</p>
          </div>

          <Input
            label="New Implementation Address"
            placeholder="0x…"
            value={newImpl}
            onChange={(e) => setNewImpl(e.target.value)}
            error={error}
          />

          <Button
            variant="secondary"
            loading={isPending || confirming}
            onClick={handleUpdateImpl}
            className="gap-1.5"
            disabled={!newImpl}
          >
            {isSuccess
              ? <><CheckCircle2 size={14} className="text-accent-green" /> Updated</>
              : <><RefreshCw size={14} /> Set New Implementation</>}
          </Button>
        </CardContent>
      </Card>

      {/* Recent tokens */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-accent-purple" />
            <h2 className="font-semibold text-text-primary text-sm">Recent Tokens</h2>
          </div>
          <span className="text-xs text-text-muted">{tokensData?.total ?? 0} total</span>
        </div>

        {tokensLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="px-5 py-3 text-left">Token</th>
                  <th className="px-5 py-3 text-left">Creator</th>
                  <th className="px-5 py-3 text-right">CRO Raised</th>
                  <th className="px-5 py-3 text-right">Status</th>
                  <th className="px-5 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tokensData?.data.map((token) => (
                  <tr key={token.address} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/tokens/${token.address}`} className="flex items-center gap-2 group">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple-light">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary group-hover:text-accent-purple-light transition-colors">{token.name}</p>
                          <p className="text-xs text-text-muted">${token.symbol}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-text-muted">{shortAddress(token.creator)}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-accent-cyan font-medium">
                      {formatCRO(token.realCroRaised)} CRO
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs font-medium ${token.graduated ? "text-accent-green" : "text-accent-purple"}`}>
                        {token.graduated ? "Graduated" : "Trading"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-text-muted text-xs">
                      {timeAgo(token.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}