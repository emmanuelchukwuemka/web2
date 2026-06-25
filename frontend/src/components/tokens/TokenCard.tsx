import Link from "next/link";
import Image from "next/image";
import { TrendingUp, BarChart2, ArrowUpRight, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type Token } from "@/lib/api";
import { formatCRO, formatPrice, formatProgress, timeAgo } from "@/lib/utils";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const progress    = formatProgress(token.realCroRaised);
  const isGraduated = token.graduated;
  const isHot       = !isGraduated && progress > 60;

  return (
    <Link href={`/tokens/${token.address}`}>
      <article className="group relative rounded-2xl border border-border bg-bg-card overflow-hidden transition-all duration-300 hover:border-gold/20 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer">

        {/* Top image / banner */}
        <div className="relative h-32 bg-bg-surface overflow-hidden">
          {token.image ? (
            <Image
              src={token.image}
              alt={token.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-overlay to-bg-elevated">
              <span className="text-4xl font-black tracking-tighter text-text-muted/30 select-none">
                {token.symbol.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />

          {/* Badges top-right */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isHot && (
              <Badge variant="amber" className="flex items-center gap-1 text-[11px] px-2 py-0.5">
                <Flame size={10} /> Hot
              </Badge>
            )}
            {isGraduated ? (
              <Badge variant="green" className="text-[11px] px-2 py-0.5">Graduated</Badge>
            ) : (
              <Badge variant="default" className="text-[11px] px-2 py-0.5">Trading</Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Token identity */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-dark/30 to-gold/20 border border-gold/20 text-sm font-black text-gold">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="font-bold text-text-primary truncate">{token.name}</p>
                <ArrowUpRight size={13} className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-text-muted">${token.symbol}</p>
            </div>
          </div>

          {/* Price + raised */}
          <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-xl bg-bg-surface border border-border/50">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Price</p>
              <p className="text-sm font-semibold text-text-primary">{formatPrice(token.currentPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Raised</p>
              <p className="text-sm font-semibold text-accent-cyan">{formatCRO(token.realCroRaised)} CRO</p>
            </div>
          </div>

          {/* Bonding curve progress */}
          {!isGraduated && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5">
                <span className="flex items-center gap-1">
                  <TrendingUp size={10} />
                  Bonding curve
                </span>
                <span className={progress > 60 ? "text-gold font-semibold" : ""}>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress > 60
                      ? "bg-gradient-to-r from-gold-dark to-gold"
                      : "bg-gradient-to-r from-accent-purple to-accent-cyan"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <BarChart2 size={11} />
              {token._count?.trades ?? 0} trades
            </span>
            <span>{timeAgo(token.createdAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}