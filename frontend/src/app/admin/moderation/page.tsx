"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAddress } from "viem";
import {
  EyeOff, Eye, Star, StarOff, Flag, Ban, Trash2,
  Search, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchAdminTokens, fetchBlocklist,
  adminToken, addToBlocklist, removeFromBlocklist,
} from "@/lib/api";
import { shortAddress, timeAgo, formatCRO } from "@/lib/utils";
import Link from "next/link";

type TokenFilter = "all" | "hidden" | "flagged" | "featured";

export default function AdminModerationPage() {
  const qc = useQueryClient();

  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("all");
  const [tokenSearch, setTokenSearch] = useState("");

  const [blockAddr,   setBlockAddr]   = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockError,  setBlockError]  = useState("");

  const tokensKey = ["admin-tokens", tokenFilter];
  const { data: tokensData, isLoading: tokensLoading } = useQuery({
    queryKey: tokensKey,
    queryFn:  () => fetchAdminTokens({
      hidden:   tokenFilter === "hidden",
      flagged:  tokenFilter === "flagged",
      featured: tokenFilter === "featured",
      limit: 100,
    }),
    refetchInterval: 15_000,
  });

  const { data: blocklist, isLoading: blocklistLoading } = useQuery({
    queryKey: ["admin-blocklist"],
    queryFn:  fetchBlocklist,
    refetchInterval: 30_000,
  });

  // Token actions
  function useTokenAction(fn: (addr: string) => Promise<void>) {
    return useMutation({
      mutationFn: fn,
      onSuccess:  () => void qc.invalidateQueries({ queryKey: ["admin-tokens"] }),
    });
  }

  const hide      = useTokenAction(adminToken.hide);
  const unhide    = useTokenAction(adminToken.unhide);
  const feature   = useTokenAction(adminToken.feature);
  const unfeature = useTokenAction(adminToken.unfeature);
  const flag      = useTokenAction((addr) => adminToken.flag(addr));
  const unflag    = useTokenAction(adminToken.unflag);

  // Blocklist actions
  const addBlock = useMutation({
    mutationFn: ({ address, reason }: { address: string; reason?: string }) =>
      addToBlocklist(address, reason),
    onSuccess: () => {
      setBlockAddr(""); setBlockReason(""); setBlockError("");
      void qc.invalidateQueries({ queryKey: ["admin-blocklist"] });
    },
    onError: (e: Error) => setBlockError(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: removeFromBlocklist,
    onSuccess:  () => void qc.invalidateQueries({ queryKey: ["admin-blocklist"] }),
  });

  const filteredTokens = (tokensData?.data ?? []).filter((t) => {
    if (!tokenSearch) return true;
    const q = tokenSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q) || t.address.includes(q);
  });

  const FILTER_TABS: Array<{ id: TokenFilter; label: string }> = [
    { id: "all",      label: "All"      },
    { id: "flagged",  label: "Flagged"  },
    { id: "hidden",   label: "Hidden"   },
    { id: "featured", label: "Featured" },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Moderation</h1>
        <p className="text-sm text-text-muted mt-0.5">Hide, flag, and feature tokens · manage blocked wallets</p>
      </div>

      {/* ── Token Moderation ───────────────────────────────────────────────────── */}
      <Card>
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-semibold text-text-primary text-sm">Tokens</h2>
            <div className="flex gap-1 rounded-lg border border-border bg-bg-elevated p-0.5">
              {FILTER_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTokenFilter(id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    tokenFilter === id
                      ? "bg-accent-purple/20 text-accent-purple-light"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, symbol, address…"
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary pl-8 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60"
            />
          </div>
        </div>

        {tokensLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filteredTokens.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-12">No tokens found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted">
                  <th className="px-4 py-3 text-left">Token</th>
                  <th className="px-4 py-3 text-left">Creator</th>
                  <th className="px-4 py-3 text-right">CRO</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTokens.map((token) => (
                  <tr key={token.address} className="hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/tokens/${token.address}`} className="flex items-center gap-2 group">
                        {token.image ? (
                          <img src={token.image} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple-light">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-text-primary group-hover:text-accent-purple-light">{token.name}</p>
                          <p className="text-xs text-text-muted">${token.symbol}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      <Link href={`/profile/${token.creator}`} className="hover:text-accent-purple-light">
                        {shortAddress(token.creator)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-accent-cyan">
                      {formatCRO(token.realCroRaised)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {token.graduated && <Badge variant="green" className="text-[10px]">Grad</Badge>}
                        {(token as unknown as { hidden: boolean }).hidden   && <Badge variant="red"    className="text-[10px]">Hidden</Badge>}
                        {token.flagged   && <Badge variant="amber"  className="text-[10px]">Flagged</Badge>}
                        {token.featured  && <Badge variant="purple" className="text-[10px]">Featured</Badge>}
                        {!(token as unknown as { hidden: boolean }).hidden && !token.flagged && !token.featured &&
                          <span className="text-xs text-text-muted">Normal</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {(token as unknown as { hidden: boolean }).hidden ? (
                          <button onClick={() => unhide.mutate(token.address)}
                            className="rounded p-1.5 text-text-muted hover:text-accent-green hover:bg-accent-green/5 transition-colors" title="Unhide">
                            <Eye size={14} />
                          </button>
                        ) : (
                          <button onClick={() => hide.mutate(token.address)}
                            className="rounded p-1.5 text-text-muted hover:text-accent-amber hover:bg-accent-amber/5 transition-colors" title="Hide">
                            <EyeOff size={14} />
                          </button>
                        )}
                        {token.featured ? (
                          <button onClick={() => unfeature.mutate(token.address)}
                            className="rounded p-1.5 text-accent-amber hover:bg-accent-amber/5 transition-colors" title="Unfeature">
                            <StarOff size={14} />
                          </button>
                        ) : (
                          <button onClick={() => feature.mutate(token.address)}
                            className="rounded p-1.5 text-text-muted hover:text-accent-amber hover:bg-accent-amber/5 transition-colors" title="Feature">
                            <Star size={14} />
                          </button>
                        )}
                        {token.flagged ? (
                          <button onClick={() => unflag.mutate(token.address)}
                            className="rounded p-1.5 text-accent-amber hover:bg-accent-amber/5 transition-colors" title="Unflag">
                            <CheckCircle2 size={14} />
                          </button>
                        ) : (
                          <button onClick={() => flag.mutate(token.address)}
                            className="rounded p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/5 transition-colors" title="Flag">
                            <Flag size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Wallet Blocklist ───────────────────────────────────────────────────── */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Ban size={15} className="text-accent-red" />
          <h2 className="font-semibold text-text-primary text-sm">Wallet Blocklist</h2>
          <span className="ml-auto text-xs text-text-muted">{blocklist?.length ?? 0} blocked</span>
        </div>

        {/* Add form */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="0x wallet address"
                value={blockAddr}
                onChange={(e) => setBlockAddr(e.target.value)}
                error={blockError}
              />
            </div>
            <Input
              placeholder="Reason (optional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="danger"
              className="gap-1.5"
              loading={addBlock.isPending}
              disabled={!isAddress(blockAddr)}
              onClick={() => {
                setBlockError("");
                if (!isAddress(blockAddr)) { setBlockError("Invalid address"); return; }
                addBlock.mutate({ address: blockAddr, reason: blockReason || undefined });
              }}
            >
              <Ban size={13} /> Block Wallet
            </Button>
            <p className="text-xs text-text-muted">
              Blocked wallets cannot buy, sell, or comment.
            </p>
          </div>
          {addBlock.isSuccess && (
            <p className="text-xs text-accent-green flex items-center gap-1">
              <CheckCircle2 size={12} /> Wallet blocked successfully.
            </p>
          )}
        </div>

        {/* Blocklist table */}
        {blocklistLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !blocklist || blocklist.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No blocked wallets.</p>
        ) : (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {blocklist.map((w) => (
              <div key={w.address} className="flex items-center gap-4 px-5 py-3">
                <AlertTriangle size={14} className="text-accent-red shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-text-primary">{shortAddress(w.address)}</p>
                  {w.reason && <p className="text-xs text-text-muted">{w.reason}</p>}
                </div>
                <span className="text-xs text-text-muted shrink-0">{timeAgo(w.blockedAt)}</span>
                <button
                  onClick={() => removeBlock.mutate(w.address)}
                  className="rounded p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/5 transition-colors"
                  title="Remove from blocklist"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}