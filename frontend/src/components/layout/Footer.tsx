import Link from "next/link";
import { ExternalLink } from "lucide-react";

const LINKS = {
  platform: [
    { href: "/tokens",  label: "Explore Tokens" },
    { href: "/launch",  label: "Launch Token"   },
    { href: "/nfts",    label: "NFT Gallery"    },
    { href: "/staking", label: "Staking"         },
  ],
  resources: [
    { href: "https://cronos.org",    label: "Cronos Chain", external: true },
    { href: "https://vvs.finance",   label: "VVS Finance",  external: true },
    { href: "https://cronoscan.com", label: "Cronoscan",    external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-bg-void mt-auto">
      <div className="page-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 w-fit group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold-dark to-gold border border-gold/30 shadow-gold-sm group-hover:shadow-gold transition-all">
                <span className="text-black font-black text-sm">N</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-black tracking-tighter gradient-text">N.W.O</span>
                <span className="text-[10px] font-medium text-text-muted tracking-widest uppercase">Launchpad</span>
              </div>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed max-w-xs">
              The premier token launchpad on Cronos EVM. Launch, trade, and earn with bonding-curve mechanics.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-xs text-accent-green-light font-medium">Live on Cronos Mainnet</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Platform</h3>
            <ul className="space-y-2.5">
              {LINKS.platform.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-text-secondary hover:text-gold transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Resources</h3>
            <ul className="space-y-2.5">
              {LINKS.resources.map(({ href, label, external }) => (
                <li key={href}>
                  <a
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-gold transition-colors"
                  >
                    {label}
                    {external && <ExternalLink size={11} className="opacity-50" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} N.W.O Launchpad. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Built on <span className="text-gold font-semibold ml-1">Cronos EVM</span>
          </span>
        </div>
      </div>
    </footer>
  );
}