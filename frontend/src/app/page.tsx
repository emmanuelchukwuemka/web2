import { Suspense } from "react";
import Link from "next/link";
import { Zap, TrendingUp, Users, ArrowRight, Shield, Rocket, BarChart2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { TokenGrid } from "@/components/tokens/TokenGrid";
import { LiveFeed } from "@/components/tokens/LiveFeed";
import { fetchTokens, type Token } from "@/lib/api";

async function StatsRow() {
  let totalTokens = 0;
  let graduated   = 0;
  try {
    const r = await fetchTokens({ limit: 1 });
    totalTokens = r.total;
    const g = await fetchTokens({ limit: 1, graduated: true });
    graduated = g.total;
  } catch { /* backend offline */ }

  const stats = [
    { label: "Tokens Launched", value: totalTokens.toLocaleString() || "—", icon: Rocket,      accent: "text-gold"             },
    { label: "Graduated",       value: graduated.toLocaleString()   || "—", icon: TrendingUp,  accent: "text-accent-green-light" },
    { label: "Network",         value: "Cronos EVM",                        icon: BarChart2,   accent: "text-accent-cyan"       },
    { label: "Active Traders",  value: "—",                                 icon: Users,       accent: "text-accent-purple-light" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, accent }) => (
        <div key={label} className="rounded-2xl border border-border/60 bg-bg-card p-4 flex items-center gap-3">
          <div className={`shrink-0 rounded-xl bg-bg-elevated p-2.5 ${accent}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-text-muted mb-0.5">{label}</p>
            <p className="text-base font-bold text-text-primary truncate">{value}</p>
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
  } catch { /* backend offline */ }
  return <TokenGrid tokens={tokens} />;
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">

        {/* Background atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Gold upper-left orb */}
          <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-gold/8 blur-[140px]" />
          {/* Gold lower-right orb */}
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-gold/6 blur-[120px]" />
          {/* Purple mid accent */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-accent-purple/8 blur-[100px]" />
        </div>

        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #F59E0B 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="page-container relative z-10 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              {/* Live pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/6 px-4 py-1.5 text-sm font-medium text-gold mb-8">
                <span className="live-dot" />
                Live on Cronos EVM
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.0] mb-6">
                Launch the{" "}
                <span className="gradient-text">Next</span>
                <br className="hidden sm:block" />
                {" "}
                <span className="gradient-text">Moonshot</span>
              </h1>

              <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-lg">
                Fair-launch tokens on Cronos with bonding curves, instant liquidity,
                and automatic DEX graduation. No presales. No rugs. Just pure market mechanics.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-12">
                <Link href="/launch">
                  <Button size="lg" className="w-full sm:w-auto gap-2 px-8 text-[15px] font-bold">
                    <Rocket size={17} />
                    Launch a Token
                  </Button>
                </Link>
                <Link href="/tokens">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 px-8 text-[15px]">
                    Explore Tokens
                    <ArrowRight size={15} />
                  </Button>
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex flex-wrap gap-5 text-sm text-text-muted">
                {[
                  { icon: Shield,    text: "Anti-rug protection" },
                  { icon: Zap,       text: "Instant liquidity"   },
                  { icon: Lock,      text: "Audited contracts"   },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon size={13} className="text-gold" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mock trading card */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-[380px]">

                {/* Glow halo */}
                <div className="absolute inset-[-20px] rounded-3xl bg-gold/8 blur-3xl" />

                {/* Card */}
                <div className="relative rounded-2xl border border-gold/15 bg-bg-card/90 backdrop-blur-xl p-5 shadow-[0_0_60px_rgba(0,0,0,0.6),0_0_30px_rgba(245,158,11,0.06)]">

                  {/* Token header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold-dark to-gold flex items-center justify-center font-black text-black text-sm shadow-gold-sm">
                        N
                      </div>
                      <div>
                        <p className="font-bold text-text-primary text-sm">New Wolf Order</p>
                        <p className="text-xs text-text-muted">$NWO</p>
                      </div>
                    </div>
                    <Badge variant="green" className="text-[11px]">+142%</Badge>
                  </div>

                  {/* Chart */}
                  <div className="h-28 w-full mb-4 rounded-xl bg-bg-surface overflow-hidden">
                    <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"    />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,72 L40,68 L80,58 L110,62 L140,48 L170,38 L200,28 L230,18 L260,10 L300,4 L300,80 L0,80 Z"
                        fill="url(#g1)"
                      />
                      <path
                        d="M0,72 L40,68 L80,58 L110,62 L140,48 L170,38 L200,28 L230,18 L260,10 L300,4"
                        fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
                      <span className="flex items-center gap-1"><TrendingUp size={9} /> Bonding curve</span>
                      <span className="text-gold font-semibold">68%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-gold-dark to-gold" />
                    </div>
                  </div>

                  {/* Buy/Sell */}
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl bg-accent-green/10 border border-accent-green/20 py-2.5 text-sm font-bold text-accent-green-light hover:bg-accent-green/20 transition-colors">
                      Buy
                    </button>
                    <button className="rounded-xl bg-accent-red/10 border border-accent-red/20 py-2.5 text-sm font-bold text-accent-red hover:bg-accent-red/20 transition-colors">
                      Sell
                    </button>
                  </div>
                </div>

                {/* Floating notification — buy */}
                <div className="absolute -bottom-5 -left-10 rounded-xl border border-border bg-bg-elevated/95 backdrop-blur-sm px-3.5 py-2.5 shadow-lg" style={{ animation: "float 3s ease-in-out infinite" }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent-green" />
                    <span className="text-xs text-text-secondary">0x3f…b12 bought</span>
                    <span className="text-xs font-bold text-accent-green">+500 CRO</span>
                  </div>
                </div>

                {/* Floating badge — launched */}
                <div className="absolute -top-5 -right-8 rounded-xl border border-gold/25 bg-gold/8 backdrop-blur-sm px-3 py-2 shadow-lg" style={{ animation: "float 4s ease-in-out infinite 1s" }}>
                  <div className="flex items-center gap-1.5">
                    <Rocket size={12} className="text-gold" />
                    <span className="text-xs font-semibold text-gold">Just launched!</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg-base to-transparent pointer-events-none" />
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section className="page-container pb-10">
        <Suspense fallback={<div className="h-20 rounded-2xl bg-bg-card animate-pulse" />}>
          <StatsRow />
        </Suspense>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="page-container pb-16">
        <div className="text-center mb-10">
          <Badge variant="gold" className="mb-4">How it works</Badge>
          <h2 className="text-3xl font-black tracking-tight text-text-primary">
            Three steps to the moon
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: "01", icon: Rocket,     title: "Launch",   desc: "Fill in your token details and pay a small creation fee. Your token goes live instantly on the bonding curve." },
            { step: "02", icon: TrendingUp, title: "Trade",    desc: "Anyone can buy and sell on the bonding curve. Price rises with each buy — early holders benefit most."         },
            { step: "03", icon: Zap,        title: "Graduate", desc: "Once 500 CRO is raised, liquidity is automatically seeded on VVS Finance. Your token becomes a real DEX pair." },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="relative rounded-2xl border border-border bg-bg-card p-6 overflow-hidden group hover:border-gold/20 hover:shadow-card-hover transition-all duration-300">
              <div className="absolute top-4 right-4 text-6xl font-black text-text-primary/[0.03] select-none leading-none">{step}</div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 border border-gold/15">
                <Icon size={18} className="text-gold" />
              </div>
              <h3 className="font-bold text-text-primary mb-2 text-base">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending + Live feed ─────────────────────────────────────────────── */}
      <section className="page-container pb-16">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/10 border border-gold/15">
                  <TrendingUp size={14} className="text-gold" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">Trending Now</h2>
              </div>
              <Link href="/tokens" className="flex items-center gap-1 text-sm text-text-muted hover:text-gold transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <Suspense fallback={<PageSpinner />}>
              <TrendingTokens />
            </Suspense>
          </div>

          <div className="w-full xl:w-80 shrink-0">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-green/10 border border-accent-green/15">
                <span className="h-2 w-2 rounded-full bg-accent-green" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Live Trades</h2>
            </div>
            <LiveFeed />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="page-container pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-gold/15 bg-gradient-to-br from-gold/6 via-bg-card to-bg-surface p-12 text-center">
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-gold/12 blur-3xl" />
          </div>
          <div className="relative">
            <Badge variant="gold" className="mb-6">New Wolf Order</Badge>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary mb-4">
              Ready to launch your token?
            </h2>
            <p className="text-text-muted text-base mb-8 max-w-md mx-auto leading-relaxed">
              Join the N.W.O ecosystem. Fair launches, real liquidity, zero presale garbage.
            </p>
            <Link href="/launch">
              <Button size="lg" className="gap-2 px-10 text-[15px] font-bold">
                <Rocket size={17} />
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}