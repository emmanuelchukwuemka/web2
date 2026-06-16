"use client";

import { useAccount, useConnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CONTROLLER_ABI, ADDRESSES } from "@/lib/contracts";
import { shortAddress } from "@/lib/utils";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const { data: owner, isLoading } = useReadContract({
    address:      ADDRESSES.controller,
    abi:          CONTROLLER_ABI,
    functionName: "owner",
    query:        { enabled: !!ADDRESSES.controller },
  });

  // Not connected
  if (!isConnected) {
    return (
      <Gated icon={<Shield size={40} className="text-accent-purple" />}>
        <h2 className="text-xl font-bold text-text-primary mb-2">Admin Access Required</h2>
        <p className="text-text-secondary mb-6 text-sm">
          Connect the owner wallet to access the admin panel.
        </p>
        <Button onClick={() => connect({ connector: injected() })}>Connect Wallet</Button>
      </Gated>
    );
  }

  // Controller not configured
  if (!ADDRESSES.controller) {
    return (
      <Gated icon={<AlertTriangle size={40} className="text-accent-amber" />}>
        <h2 className="text-xl font-bold text-text-primary mb-2">Controller Not Configured</h2>
        <p className="text-text-secondary text-sm">
          Set <code className="text-accent-purple-light">NEXT_PUBLIC_CONTROLLER_ADDRESS</code> in your environment.
        </p>
      </Gated>
    );
  }

  // Loading owner
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Wrong wallet
  if (owner && address?.toLowerCase() !== (owner as string).toLowerCase()) {
    return (
      <Gated icon={<AlertTriangle size={40} className="text-accent-red" />}>
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-text-secondary text-sm mb-4">
          Connected as <span className="font-mono text-text-primary">{shortAddress(address!)}</span>.
          <br />
          Owner is <span className="font-mono text-text-primary">{shortAddress(owner as string)}</span>.
        </p>
        <p className="text-xs text-text-muted">Switch to the owner wallet in MetaMask.</p>
      </Gated>
    );
  }

  return <>{children}</>;
}

function Gated({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-10 text-center shadow-card">
        <div className="mb-5 flex justify-center">{icon}</div>
        {children}
      </div>
    </div>
  );
}