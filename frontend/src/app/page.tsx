import { Suspense } from "react";
import Link from "next/link";
import { Zap, TrendingUp, Layers, Users, ArrowRight, Shield, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { TokenGrid } from "@/components/tokens/TokenGrid";
import { LiveFeed } from "@/components/tokens/LiveFeed";
import { fetchTokens, type Token } from "@/lib/api";

async function StatsRow() {
  let totalTokens = 0;
  let graduated = 0;
  try {
    const r = await fetchTokens({ limit: 1 });
    totalTokens = r.total;
    const g = await fetchTokens({ limit: 1, graduated: true });
    graduated = g.total;
  } catch { /* backend not yet running */ }

  const stats = [
    { label: "Tokens Launched", value: totalTokens.toLocaleString(), icon: Zap,        color: "text-accent-purple" },
    { label: "Graduated",       value: graduated.toLocaleString(),    icon: TrendingUp, color: "text-accent-green"  },
    { label: "On Cronos",       value: "Cronos EVM",                  icon: Layers,     color: "text-accent-cyan"   },
    { label: "Active Traders",  value: "—",                           icon: Users,      color: "text-accent-amber"  },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="stat-card flex items-center gap-4">
          <div className={`rounded-lg bg-bg-primary p-2.5 ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm text-text-muted">{label}</p>
            <p className="text-lg font-bold text-text-primary">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

async function TrendingTokens() {
  let tokens: Token[] = [];
  try {
    const r = await fetchTokens({ limit: 12, sort: "realCroRaised", order: "desc", graduated: false });
    tokens = r.data;
  } catch { /* backend not yet running */ }
  return <TokenGrid tokens={tokens} />;
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center">

        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-accent-purple/20 blur-[120px] animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute bottom-[-5%] right-[-5%] h-[450px] w-[450px] rounded-full bg-accent-cyan/15 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-accent-purple/10 blur-[80px] animate-pulse" style={{ animationDuration: "5s" }} />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="page-container relative z-10 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-purple/30 bg-accent-purple/8 px-4 py-1.5 text-sm text-accent-purple-light mb-8">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                Live on Cronos EVM
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
                Launch the{" "}
                <span className="gradient-text">Next</span>
                <br />
                <span className="gradient-text">Moonshot</span>
              </h1>

              <p className="text-lg text-text-secondary mb-10 max-w-lg leading-relaxed">
                Fair-launch tokens and NFTs on Cronos with bonding curves, instant liquidity,
                and automatic DEX graduation. No presales. No rugs. No BS.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/launch">
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8">
                    <Rocket size={18} />
                    Launch a Token
                  </Button>
                </Link>
                <Link href="/tokens">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-base px-8">
                    Explore Tokens
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6 text-sm text-text-muted">
                {[
                  { icon: Shield, text: "Anti-rug protection" },
                  { icon: Zap,    text: "Instant liquidity"   },
                  { icon: TrendingUp, text: "Auto DEX listing" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon size={14} className="text-accent-purple" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — animated card visual */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-[380px]">

                {/* Floating glow behind card */}
                <div className="absolute inset-0 rounded-3xl bg-accent-purple/20 blur-2xl scale-110" />

                {/* Main card */}
                <div className="relative rounded-2xl border border-border bg-bg-card/80 backdrop-blur-xl p-5 shadow-xl">

                  {/* Card header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center font-bold text-white text-sm">
                        NWO
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm">New Wolf Order</p>
                        <p className="text-xs text-text-muted">$NWO</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-accent-green bg-accent-green/10 rounded-full px-2.5 py-1">
                      +142%
                    </span>
                  </div>

                  {/* Fake chart */}
                  <div className="h-28 w-full mb-4 relative overflow-hidden rounded-xl bg-bg-primary">
                    <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,70 L30,65 L60,55 L90,60 L120,45 L150,40 L180,30 L210,25 L240,15 L270,10 L300,5 L300,80 L0,80 Z"
                        fill="url(#chartGrad)"
                      />
                      <path
                        d="M0,70 L30,65 L60,55 L90,60 L120,45 L150,40 L180,30 L210,25 L240,15 L270,10 L300,5"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-text-muted mb-1.5">
                      <span>Bonding progress</span>
                      <span className="text-accent-purple-light font-medium">68%</span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
                      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan" />
                    </div>
                  </div>

                  {/* Buy/Sell */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-accent-green/10 border border-accent-green/20 py-2.5 text-sm font-semibold text-accent-green hover:bg-accent-green/20 transition-colors">
                      Buy
                    </button>
                    <button className="rounded-xl bg-accent-red/10 border border-accent-red/20 py-2.5 text-sm font-semibold text-accent-red hover:bg-accent-red/20 transition-colors">
                      Sell
                    </button>
                  </div>
                </div>

                {/* Floating trade notification */}
                <div className="absolute -bottom-4 -left-8 rounded-xl border border-border bg-bg-elevated/90 backdrop-blur-sm px-3.5 py-2.5 shadow-lg animate-bounce" style={{ animationDuration: "3s" }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent-green" />
                    <span className="text-xs font-medium text-text-primary">0x3f…ab12 bought</span>
                    <span className="text-xs font-bold text-accent-green">+500 CRO</span>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-4 -right-6 rounded-xl border border-accent-purple/30 bg-accent-purple/10 backdrop-blur-sm px-3.5 py-2 shadow-lg animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                  <div className="flex items-center gap-1.5">
                    <Rocket size={12} className="text-accent-purple" />
                    <span className="text-xs font-semibold text-accent-purple-light">Just launched!</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none" />
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="page-container pb-8">
        <Suspense fallback={<div className="h-24 rounded-xl bg-bg-card animate-pulse" />}>
          <StatsRow />
        </Suspense>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="page-container pb-16">
        <h2 className="section-title text-center mb-2">How it works</h2>
        <p className="text-center text-text-muted text-sm mb-8">Three steps to launch your token</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "01", icon: Rocket,     title: "Launch",   desc: "Fill in your token details and pay a small creation fee. Your token goes live instantly on the bonding curve." },
            { step: "02", icon: TrendingUp, title: "Trade",    desc: "Anyone can buy and sell on the bonding curve. Price rises with each buy — early holders benefit most." },
            { step: "03", icon: Zap,        title: "Graduate", desc: "Once 500 CRO is raised, liquidity is automatically added to VVS Finance. Your token is now a real DEX pair." },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="relative rounded-2xl border border-border bg-bg-card p-6 overflow-hidden group hover:border-accent-purple/40 transition-colors">
              <div className="absolute top-4 right-4 text-5xl font-black text-text-muted/8 select-none">{step}</div>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10">
                <Icon size={18} className="text-accent-purple" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending + Live feed ─────────────────────────────────────────────── */}
      <section className="page-container pb-16">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="section-title flex items-center gap-2">
                <TrendingUp size={18} className="text-accent-purple" />
                Trending Now
              </h2>
              <Link href="/tokens" className="text-sm text-text-muted hover:text-accent-purple-light transition-colors">
                View all →
              </Link>
            </div>
            <Suspense fallback={<PageSpinner />}>
              <TrendingTokens />
            </Suspense>
          </div>

          <div className="w-full xl:w-80 shrink-0">
            <h2 className="section-title flex items-center gap-2 mb-5">
              <span className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
              Live Trades
            </h2>
            <LiveFeed />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────────── */}
      <section className="page-container pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-accent-purple/20 bg-gradient-to-br from-accent-purple/10 via-bg-card to-accent-cyan/5 p-10 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-80 rounded-full bg-accent-purple/20 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-text-primary mb-3">
              Ready to launch your token?
            </h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              Join the N.W.O ecosystem. Fair launches, real liquidity, zero presale.
            </p>
            <Link href="/launch">
              <Button size="lg" className="gap-2 px-10 text-base">
                <Rocket size={18} />
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}