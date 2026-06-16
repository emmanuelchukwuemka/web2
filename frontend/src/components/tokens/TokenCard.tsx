import Link from "next/link";
import { TrendingUp, BarChart2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Token } from "@/lib/api";
import { formatCRO, formatPrice, formatProgress, shortAddress, timeAgo } from "@/lib/utils";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const progress = formatProgress(token.realCroRaised);
  const isGraduated = token.graduated;

  return (
    <Link href={`/tokens/${token.address}`}>
      <div className="group rounded-xl border border-border bg-bg-card p-4 transition-all duration-200 hover:border-accent-purple/40 hover:shadow-card hover:bg-bg-card/80 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Token identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30 border border-accent-purple/20 text-sm font-bold text-accent-purple-light">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-text-primary truncate">{token.name}</p>
                <ArrowUpRight size={13} className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-text-muted">${token.symbol}</p>
            </div>
          </div>

          {/* Status badge */}
          {isGraduated ? (
            <Badge variant="green" className="shrink-0">Graduated</Badge>
          ) : (
            <Badge variant="purple" className="shrink-0">Trading</Badge>
          )}
        </div>

        {/* Price + raised */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Price</p>
            <p className="text-sm font-medium text-text-primary">{formatPrice(token.currentPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">CRO Raised</p>
            <p className="text-sm font-medium text-accent-cyan">{formatCRO(token.realCroRaised)} CRO</p>
          </div>
        </div>

        {/* Progress to graduation */}
        {!isGraduated && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
              <span className="flex items-center gap-1">
                <TrendingUp size={10} />
                Bonding curve
              </span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <BarChart2 size={11} />
            {token._count?.trades ?? 0} trades
          </span>
          <span>{timeAgo(token.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}