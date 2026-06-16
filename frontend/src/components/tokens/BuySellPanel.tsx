"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount, useReadContract, useWriteContract,
  useWaitForTransactionReceipt, useBalance,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { useConnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle, Settings2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCRO, formatProgress } from "@/lib/utils";
import { BONDING_CURVE_ABI, ERC20_ABI } from "@/lib/contracts";
import { fetchToken } from "@/lib/api";

interface BuySellPanelProps {
  tokenAddress: string;
  curveAddress: string;
}

type Mode = "buy" | "sell";

const SLIPPAGE_PRESETS = [0.5, 1, 2, 5];

export function BuySellPanel({ tokenAddress, curveAddress }: BuySellPanelProps) {
  const [mode,           setMode]           = useState<Mode>("buy");
  const [amount,         setAmount]         = useState("");
  const [slippage,       setSlippage]       = useState(1);
  const [slippageCustom, setSlippageCustom] = useState("");
  const [showSlippage,   setShowSlippage]   = useState(false);

  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();

  const effectiveSlippage = slippageCustom ? Number(slippageCustom) : slippage;

  const { data: token } = useQuery({
    queryKey:        ["token", tokenAddress],
    queryFn:         () => fetchToken(tokenAddress),
    refetchInterval: 10_000,
  });

  const { data: croBalance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const { data: tokenBalance } = useReadContract({
    address:      tokenAddress as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  const { data: tokensOut } = useReadContract({
    address:      curveAddress as `0x${string}`,
    abi:          BONDING_CURVE_ABI,
    functionName: "getTokensOut",
    args:         mode === "buy" && amount ? [parseEther(amount)] : undefined,
    query:        { enabled: mode === "buy" && !!amount && Number(amount) > 0 },
  });

  const { data: croOut } = useReadContract({
    address:      curveAddress as `0x${string}`,
    abi:          BONDING_CURVE_ABI,
    functionName: "getCroOut",
    args:         mode === "sell" && amount ? [parseEther(amount)] : undefined,
    query:        { enabled: mode === "sell" && !!amount && Number(amount) > 0 },
  });

  const { data: allowance } = useReadContract({
    address:      tokenAddress as `0x${string}`,
    abi:          ERC20_ABI,
    functionName: "allowance",
    args:         address ? [address, curveAddress as `0x${string}`] : undefined,
    query:        { enabled: mode === "sell" && !!address },
  });

  const needsApproval =
    mode === "sell" && amount && (allowance ?? 0n) < parseEther(amount);

  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { isLoading: approveLoading } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: execute, data: execTxHash, isPending: execPending } = useWriteContract();
  const { isLoading: execLoading, isSuccess: execSuccess } = useWaitForTransactionReceipt({ hash: execTxHash });

  const isGraduated = token?.graduated;

  // Compute min amounts with slippage
  function minTokensOut(): bigint {
    if (!tokensOut) return 0n;
    const pct = BigInt(Math.floor((100 - effectiveSlippage) * 100));
    return ((tokensOut as bigint) * pct) / 10000n;
  }

  function minCroOut(): bigint {
    if (!croOut) return 0n;
    const pct = BigInt(Math.floor((100 - effectiveSlippage) * 100));
    return ((croOut as bigint) * pct) / 10000n;
  }

  function handleApprove() {
    if (!amount) return;
    approve({
      address:      tokenAddress as `0x${string}`,
      abi:          ERC20_ABI,
      functionName: "approve",
      args:         [curveAddress as `0x${string}`, parseEther(amount)],
    });
  }

  function handleExecute() {
    if (!amount) return;
    if (mode === "buy") {
      execute({
        address:      curveAddress as `0x${string}`,
        abi:          BONDING_CURVE_ABI,
        functionName: "buy",
        args:         [minTokensOut()],
        value:        parseEther(amount),
      });
    } else {
      execute({
        address:      curveAddress as `0x${string}`,
        abi:          BONDING_CURVE_ABI,
        functionName: "sell",
        args:         [parseEther(amount), minCroOut()],
      });
    }
  }

  const progress = token ? formatProgress(token.realCroRaised) : 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5 space-y-5">
      {/* Graduation progress */}
      {token && (
        <div>
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Bonding curve progress</span>
            <span className="font-medium text-text-primary">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-bg-primary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                progress >= 100
                  ? "bg-accent-green"
                  : "bg-gradient-to-r from-accent-purple to-accent-cyan"
              )}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1.5">
            <span className="text-text-muted">{formatCRO(token.realCroRaised)} CRO raised</span>
            <span className="text-text-muted">500 CRO goal</span>
          </div>
        </div>
      )}

      {/* Graduated banner */}
      {isGraduated && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-accent-green/20 bg-accent-green/5 px-4 py-3 text-sm text-accent-green">
            <CheckCircle size={16} />
            This token graduated to VVS Finance DEX.
          </div>
          <a
            href={`https://vvs.finance/swap?outputCurrency=${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-accent-purple/30 bg-accent-purple/5 px-4 py-2.5 text-sm text-accent-purple-light hover:bg-accent-purple/10 transition-colors"
          >
            <ExternalLink size={14} />
            Trade on VVS Finance
          </a>
        </div>
      )}

      {!isGraduated && (
        <>
          {/* Buy / Sell toggle + slippage button */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-lg border border-border bg-bg-elevated p-1 gap-1">
              {(["buy", "sell"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setAmount(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-all",
                    mode === m && m === "buy"
                      ? "bg-accent-green/20 text-accent-green"
                      : mode === m && m === "sell"
                      ? "bg-accent-red/20 text-accent-red"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {m === "buy" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSlippage(!showSlippage)}
              className={cn(
                "rounded-lg border p-2 transition-colors",
                showSlippage
                  ? "border-accent-purple/40 bg-accent-purple/10 text-accent-purple-light"
                  : "border-border text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )}
              title="Slippage settings"
            >
              <Settings2 size={15} />
            </button>
          </div>

          {/* Slippage panel */}
          {showSlippage && (
            <div className="rounded-lg border border-border bg-bg-elevated p-3 space-y-2">
              <p className="text-xs text-text-muted font-medium">Slippage tolerance</p>
              <div className="flex items-center gap-2">
                {SLIPPAGE_PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSlippage(s); setSlippageCustom(""); }}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      slippage === s && !slippageCustom
                        ? "bg-accent-purple/20 text-accent-purple-light"
                        : "bg-bg-primary text-text-muted hover:text-text-primary"
                    )}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  placeholder="Custom"
                  value={slippageCustom}
                  onChange={(e) => setSlippageCustom(e.target.value)}
                  className="w-16 rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60"
                />
                <span className="text-xs text-text-muted">%</span>
              </div>
              {effectiveSlippage > 5 && (
                <p className="text-xs text-accent-amber flex items-center gap-1">
                  <AlertCircle size={10} /> High slippage — you may receive much less than expected
                </p>
              )}
            </div>
          )}

          {/* Amount input */}
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            suffix={mode === "buy" ? "CRO" : "TOKEN"}
            label={mode === "buy" ? "You pay (CRO)" : "You sell (tokens)"}
          />

          {/* Balance */}
          {isConnected && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>
                Balance:{" "}
                {mode === "buy"
                  ? `${formatCRO(croBalance?.value ?? 0n)} CRO`
                  : `${tokenBalance ? Number(formatEther(tokenBalance as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} tokens`}
              </span>
              {mode === "buy" && croBalance && (
                <button className="text-accent-purple-light hover:underline"
                  onClick={() => setAmount(formatEther(croBalance.value))}>
                  MAX
                </button>
              )}
            </div>
          )}

          {/* Price estimate */}
          {amount && Number(amount) > 0 && (
            <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm space-y-1.5">
              {mode === "buy" && tokensOut !== undefined && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">You receive (est.)</span>
                    <span className="font-medium text-accent-green">
                      {Number(formatEther(tokensOut as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Minimum received</span>
                    <span className="text-xs text-text-muted">
                      {Number(formatEther(minTokensOut())).toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                    </span>
                  </div>
                </>
              )}
              {mode === "sell" && croOut !== undefined && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">You receive (est.)</span>
                    <span className="font-medium text-accent-green">{formatCRO(croOut as bigint)} CRO</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Minimum received</span>
                    <span className="text-xs text-text-muted">{formatCRO(minCroOut())} CRO</span>
                  </div>
                </>
              )}
              <p className="text-xs text-text-muted">
                <AlertCircle size={10} className="inline mr-1" />
                1% fee applies · {effectiveSlippage}% slippage tolerance
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!isConnected ? (
            <Button className="w-full" onClick={() => connect({ connector: injected() })}>
              Connect Wallet
            </Button>
          ) : needsApproval ? (
            <Button className="w-full" variant="secondary" loading={approveLoading} onClick={handleApprove}>
              Approve tokens
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={mode === "buy" ? "success" : "danger"}
              loading={execPending || execLoading}
              onClick={handleExecute}
              disabled={!amount || Number(amount) <= 0}
            >
              {execSuccess
                ? "Transaction confirmed!"
                : mode === "buy" ? `Buy ${amount ? "tokens" : ""}`
                : `Sell ${amount ? "tokens" : ""}`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}