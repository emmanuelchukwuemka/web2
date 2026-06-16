"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Minus, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NFT_COLLECTION_ABI } from "@/lib/contracts";

interface MintPanelProps {
  collectionAddress: string;
}

export function MintPanel({ collectionAddress }: MintPanelProps) {
  const [qty, setQty] = useState(1);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const { data: totalSupply } = useReadContract({
    address:      collectionAddress as `0x${string}`,
    abi:          NFT_COLLECTION_ABI,
    functionName: "totalSupply",
  });

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function handleMint() {
    reset();
    writeContract({
      address:      collectionAddress as `0x${string}`,
      abi:          NFT_COLLECTION_ABI,
      functionName: "publicMint",
      args:         [BigInt(qty)],
      value:        0n,
    });
  }

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-accent-green/20 bg-accent-green/5 p-6 text-center">
        <CheckCircle size={32} className="text-accent-green mx-auto mb-3" />
        <p className="font-semibold text-text-primary mb-1">Minted {qty} NFT{qty > 1 ? "s" : ""}!</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>
          Mint more
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 space-y-5">
      <h3 className="text-base font-semibold text-text-primary">Mint NFT</h3>

      {totalSupply !== undefined && (
        <div className="text-sm text-text-muted">
          Minted: <span className="text-text-primary font-medium">{totalSupply.toString()}</span>
        </div>
      )}

      {/* Qty selector */}
      <div>
        <p className="text-xs text-text-muted mb-2">Quantity</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated hover:bg-border transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-xl font-bold text-text-primary w-8 text-center">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated hover:bg-border transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-accent-red rounded-lg border border-accent-red/20 bg-accent-red/5 px-3 py-2">
          {error.message.split("\n")[0]}
        </div>
      )}

      {!isConnected ? (
        <Button className="w-full" onClick={() => connect({ connector: injected() })}>
          Connect Wallet
        </Button>
      ) : (
        <Button className="w-full" loading={isPending || confirming} onClick={handleMint}>
          {confirming ? "Confirming…" : `Mint ${qty} NFT${qty > 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  );
}