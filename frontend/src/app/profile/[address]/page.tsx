import Link from "next/link";
import { ExternalLink, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchProfile } from "@/lib/api";
import { shortAddress, explorerAddress, formatCRO, formatProgress, timeAgo } from "@/lib/utils";

interface Props { params: { address: string } }

export default async function ProfilePage({ params }: Props) {
  const { address } = params;

  let profile;
  try { profile = await fetchProfile(address); }
  catch {
    return (
      <div className="page-container py-16 text-center">
        <p className="text-text-muted">Profile not found or backend unavailable.</p>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      {/* Profile header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30 border border-accent-purple/20 text-xl font-bold text-accent-purple-light">
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary font-mono">{shortAddress(address)}</h1>
            <a
              href={explorerAddress(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent-purple-light transition-colors mt-0.5"
            >
              <ExternalLink size={12} />
              View on Cronoscan
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Tokens Created", value: profile.createdTokens.length },
            { label: "Total Trades",   value: profile.totalTrades.toLocaleString() },
            { label: "Recent Activity", value: profile.recentTrades.length > 0 ? timeAgo(profile.recentTrades[0].timestamp) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="stat-card">
              <p className="text-xs text-text-muted mb-1">{label}</p>
              <p className="text-lg font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tokens created */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Zap size={15} className="text-accent-purple" />
            <h2 className="font-semibold text-text-primary text-sm">
              Tokens Created ({profile.createdTokens.length})
            </h2>
          </div>
          {profile.createdTokens.length === 0 ? (
            <CardContent>
              <p className="text-sm text-text-muted text-center py-8">No tokens created yet.</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {profile.createdTokens.map((token) => {
                const progress = formatProgress(token.realCroRaised);
                return (
                  <Link
                    key={token.address}
                    href={`/tokens/${token.address}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-elevated transition-colors"
                  >
                    {token.image ? (
                      <img src={token.image} alt={token.name}
                        className="h-9 w-9 rounded-full object-cover border border-border shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-purple/10 text-xs font-bold text-accent-purple-light shrink-0">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary truncate">{token.name}</span>
                        <span className="text-xs text-text-muted">${token.symbol}</span>
                        {token.graduated
                          ? <Badge variant="green" className="text-[10px] py-0">Grad</Badge>
                          : <Badge variant="purple" className="text-[10px] py-0">Live</Badge>}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1 h-1 w-full rounded-full bg-bg-primary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-text-muted mt-0.5">
                        <span>{formatCRO(token.realCroRaised)} CRO</span>
                        <span>{token._count.trades} trades</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent trades */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <ArrowUpRight size={15} className="text-accent-green" />
            <h2 className="font-semibold text-text-primary text-sm">
              Recent Trades ({profile.totalTrades.toLocaleString()})
            </h2>
          </div>
          {profile.recentTrades.length === 0 ? (
            <CardContent>
              <p className="text-sm text-text-muted text-center py-8">No trades yet.</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {profile.recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center gap-3 px-5 py-3">
                  {trade.isBuy
                    ? <ArrowUpRight size={16} className="text-accent-green shrink-0" />
                    : <ArrowDownRight size={16} className="text-accent-red shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {trade.token?.image && (
                        <img src={trade.token.image} alt=""
                          className="h-4 w-4 rounded-full object-cover" />
                      )}
                      <Link href={`/tokens/${trade.tokenAddr}`}
                        className="text-sm font-medium text-text-primary hover:text-accent-purple-light truncate">
                        {trade.token?.name ?? shortAddress(trade.tokenAddr)}
                      </Link>
                    </div>
                    <p className="text-xs text-text-muted">{timeAgo(trade.timestamp)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-medium ${trade.isBuy ? "text-accent-green" : "text-accent-red"}`}>
                      {trade.isBuy ? "+" : "-"}{formatCRO(trade.croAmount)} CRO
                    </p>
                    <a href={`https://cronoscan.com/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-text-muted hover:text-accent-purple-light">
                      <ExternalLink size={10} className="inline mr-0.5" />
                      tx
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}