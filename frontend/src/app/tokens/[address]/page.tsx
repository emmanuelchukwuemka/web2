import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, TrendingUp, Globe, Twitter, Send, MessageCircle, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { PriceChart } from "@/components/tokens/PriceChart";
import { BuySellPanel } from "@/components/tokens/BuySellPanel";
import { TradeHistory } from "@/components/tokens/TradeHistory";
import { HolderList } from "@/components/tokens/HolderList";
import { Comments } from "@/components/tokens/Comments";
import { SafetyBadge } from "@/components/tokens/SafetyBadge";
import { TokenTabs } from "@/components/tokens/TokenTabs";
import { fetchToken } from "@/lib/api";
import { formatCRO, formatPrice, formatProgress, shortAddress, explorerAddress } from "@/lib/utils";

interface Props { params: { address: string } }

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 338);

async function TokenHeader({ address }: { address: string }) {
  let token;
  try { token = await fetchToken(address); }
  catch {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
        <p className="text-text-muted">Token not found or backend unavailable.</p>
      </div>
    );
  }
  const progress = formatProgress(token.realCroRaised);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Image + name */}
        <div className="flex items-start gap-4">
          {token.image ? (
            <img
              src={token.image}
              alt={token.name}
              className="h-16 w-16 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30 border border-accent-purple/20 text-lg font-bold text-accent-purple-light shrink-0">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{token.name}</h1>
              <span className="text-sm text-text-muted font-mono">${token.symbol}</span>
              {token.graduated
                ? <Badge variant="green">Graduated</Badge>
                : <Badge variant="purple">Trading</Badge>}
              {token.flagged && (
                <Badge variant="red" className="gap-1"><Flag size={10} /> Flagged</Badge>
              )}
              <SafetyBadge tokenAddress={address} chainId={CHAIN_ID} />
            </div>

            <div className="flex items-center gap-2 mt-1 text-sm text-text-muted flex-wrap">
              <Link href={`/profile/${token.creator}`} className="hover:text-accent-purple-light transition-colors">
                by {shortAddress(token.creator)}
              </Link>
              <a href={explorerAddress(token.address, true)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent-purple-light transition-colors">
                <ExternalLink size={12} /> Cronoscan
              </a>
            </div>

            {/* Description */}
            {token.description && (
              <p className="mt-2 text-sm text-text-secondary max-w-xl leading-relaxed">{token.description}</p>
            )}

            {/* Social links */}
            {(token.website || token.twitter || token.telegram || token.discord) && (
              <div className="flex items-center gap-3 mt-2">
                {token.website && (
                  <a href={token.website} target="_blank" rel="noopener noreferrer"
                    className="text-text-muted hover:text-accent-purple-light transition-colors" title="Website">
                    <Globe size={15} />
                  </a>
                )}
                {token.twitter && (
                  <a href={token.twitter.startsWith("http") ? token.twitter : `https://twitter.com/${token.twitter.replace("@","")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-text-muted hover:text-accent-cyan transition-colors" title="Twitter / X">
                    <Twitter size={15} />
                  </a>
                )}
                {token.telegram && (
                  <a href={token.telegram.startsWith("http") ? token.telegram : `https://t.me/${token.telegram}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-text-muted hover:text-accent-purple-light transition-colors" title="Telegram">
                    <Send size={15} />
                  </a>
                )}
                {token.discord && (
                  <a href={token.discord.startsWith("http") ? token.discord : `https://discord.gg/${token.discord}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-text-muted hover:text-accent-purple transition-colors" title="Discord">
                    <MessageCircle size={15} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Price stats */}
        <div className="sm:ml-auto grid grid-cols-3 gap-5 text-sm shrink-0">
          <div>
            <p className="text-text-muted text-xs mb-0.5">Price</p>
            <p className="font-semibold text-text-primary">{formatPrice(token.currentPrice)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">CRO Raised</p>
            <p className="font-semibold text-accent-cyan">{formatCRO(token.realCroRaised)} CRO</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Progress</p>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-accent-purple" />
              <p className="font-semibold text-text-primary">{progress.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function TokenDetailPage({ params }: Props) {
  const { address } = params;

  let bondingCurve = "";
  try {
    const token  = await fetchToken(address);
    bondingCurve = token.bondingCurve;
  } catch { /* token not found */ }

  return (
    <div className="page-container py-8">
      <Link href="/tokens"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
        <ChevronLeft size={15} /> Back to tokens
      </Link>

      <div className="mb-6">
        <Suspense fallback={<div className="h-36 rounded-xl bg-bg-card animate-pulse" />}>
          <TokenHeader address={address} />
        </Suspense>
      </div>

      {/* Main layout */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Left column — tabbed content */}
        <div className="flex-1 min-w-0">
          <TokenTabs tokenAddress={address} />
        </div>

        {/* Right column — buy/sell */}
        <div className="w-full xl:w-80 shrink-0">
          <BuySellPanel tokenAddress={address} curveAddress={bondingCurve} />
        </div>
      </div>
    </div>
  );
}