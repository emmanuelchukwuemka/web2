"use client";

import { useConnect, useDisconnect, useAccount } from "wagmi";
import { X, Wallet, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn, shortAddress } from "@/lib/utils";

const CONNECTOR_META: Record<string, { label: string; icon: string }> = {
  injected:       { label: "Browser Wallet",  icon: "🌐" },
  metaMask:       { label: "MetaMask",        icon: "🦊" },
  metaMaskSDK:    { label: "MetaMask",        icon: "🦊" },
  walletConnect:  { label: "WalletConnect",   icon: "🔗" },
  coinbaseWallet: { label: "Coinbase Wallet", icon: "🔵" },
};

function getConnectorMeta(id: string) {
  return CONNECTOR_META[id] ?? { label: id, icon: "💼" };
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10">{children}</div>
    </div>,
    document.body
  );
}

export function ConnectModal() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen]       = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Deduplicate connectors by name
  const unique = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setDropOpen(!dropOpen)}
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-border-hover"
        >
          <span className="h-2 w-2 rounded-full bg-accent-green" />
          {shortAddress(address)}
          <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform", dropOpen && "rotate-180")} />
        </button>
        {dropOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-bg-elevated shadow-card z-50">
            <button
              onClick={() => { disconnect(); setDropOpen(false); }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm text-accent-red hover:bg-accent-red/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:bg-accent-purple/90 transition-colors"
      >
        <Wallet size={15} />
        Connect Wallet
      </button>

      {mounted && open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="w-[90vw] max-w-sm rounded-2xl border border-border bg-bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-text-primary">Connect Wallet</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Connectors */}
            <div className="p-4 space-y-2">
              {unique.map((connector) => {
                const meta = getConnectorMeta(connector.id);
                return (
                  <button
                    key={connector.id}
                    disabled={isPending}
                    onClick={() => { connect({ connector }); setOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3.5 text-sm font-medium text-text-primary transition-all hover:border-accent-purple/40 hover:bg-accent-purple/5 disabled:opacity-50"
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="ml-auto text-xs text-text-muted">{connector.name}</span>
                  </button>
                );
              })}

              {unique.length === 0 && (
                <p className="text-center text-sm text-text-muted py-4">
                  No wallets detected. Install{" "}
                  <a href="https://metamask.io" target="_blank" rel="noopener noreferrer"
                    className="text-accent-purple-light underline">
                    MetaMask
                  </a>{" "}
                  to continue.
                </p>
              )}

              {error && (
                <p className="text-xs text-accent-red text-center pt-1">{error.message}</p>
              )}
            </div>

            <p className="px-5 pb-4 text-xs text-text-muted text-center">
              By connecting you agree to our Terms of Service
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}