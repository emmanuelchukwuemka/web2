"use client";

import { useState } from "react";
import { formatEther, parseEther, maxUint256 } from "viem";
import {
  useAccount, useConnect, useReadContract,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, Gift, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { STAKING_ABI, ERC20_ABI, ADDRESSES } from "@/lib/contracts";
import { fetchStakingStats, fetchStakingEvents } from "@/lib/api";
import { formatCRO, shortAddress, timeAgo } from "@/lib/utils";

// ── Sub-components ────────────────────────────────────────────────────────────

function GlobalStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["staking-stats"],
    queryFn:  fetchStakingStats,
    refetchInterval: 15_000,
  });

  if (isLoading) return <div className="h-28 rounded-xl bg-bg-card animate-pulse" />;
  if (!data)     return null;

  const totalStaked = data.liveStats?.totalStaked ?? "0";

  const stats = [
    { label: "Total WOLF Staked",    value: `${Number(formatEther(BigInt(totalStaked))).toLocaleString(undefined, { maximumFractionDigits: 0 })} WOLF`, icon: Coins,       color: "text-accent-purple" },
    { label: "Fees Distributed",     value: `${formatCRO(data.totalFeesDistributed)} CRO`,                                                              icon: Gift,        color: "text-accent-green"  },
    { label: "Stake Events",         value: (data.eventCounts["stake"] ?? 0).toLocaleString(),                                                           icon: TrendingUp,  color: "text-accent-cyan"   },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="stat-card flex items-center gap-4">
          <div className={`rounded-lg bg-bg-primary p-2.5 ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-xs text-text-muted">{label}</p>
            <p className="text-base font-bold text-text-primary">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StakePanel() {
  const [amount, setAmount] = useState("");
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  // WOLF balance
  const { data: wolfBalance, refetch: refetchBalance } = useReadContract({
    address:      ADDRESSES.wolf,
    abi:          ERC20_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  // Allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      ADDRESSES.wolf,
    abi:          ERC20_ABI,
    functionName: "allowance",
    args:         address && ADDRESSES.staking ? [address, ADDRESSES.staking] : undefined,
    query:        { enabled: !!address && !!ADDRESSES.staking },
  });

  const needsApproval = !!(amount && (allowance ?? 0n) < parseEther(amount));

  // Approve
  const { writeContract: approve, data: approveTx, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming } = useWaitForTransactionReceipt({
    hash: approveTx,
    onReplaced: () => { refetchAllowance(); },
  });

  // Stake
  const { writeContract: stake, data: stakeTx, isPending: stakePending } = useWriteContract();
  const { isLoading: stakeConfirming, isSuccess: stakeSuccess } = useWaitForTransactionReceipt({
    hash: stakeTx,
    onReplaced: () => { refetchBalance(); refetchAllowance(); },
  });

  function handleApprove() {
    approve({
      address:      ADDRESSES.wolf,
      abi:          ERC20_ABI,
      functionName: "approve",
      args:         [ADDRESSES.staking, maxUint256],
    });
  }

  function handleStake() {
    if (!amount) return;
    stake({
      address:      ADDRESSES.staking,
      abi:          STAKING_ABI,
      functionName: "stake",
      args:         [parseEther(amount)],
    });
  }

  const balance = wolfBalance ? Number(formatEther(wolfBalance as bigint)) : 0;

  return (
    <Card>
      <CardHeader><CardTitle>Stake WOLF</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted">
          Stake WOLF to earn a proportional share of all platform CRO fees.
        </p>

        <Input
          type="number"
          label="Amount to stake"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix="WOLF"
        />

        {isConnected && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Balance: {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} WOLF</span>
            <button className="text-accent-purple-light hover:underline" onClick={() => setAmount(String(balance))}>
              MAX
            </button>
          </div>
        )}

        {stakeSuccess && (
          <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-4 py-3 text-sm text-accent-green">
            Staked successfully!
          </div>
        )}

        {!isConnected ? (
          <Button className="w-full" onClick={() => connect({ connector: injected() })}>
            Connect Wallet
          </Button>
        ) : needsApproval ? (
          <Button className="w-full" variant="secondary" loading={approvePending || approveConfirming} onClick={handleApprove}>
            Approve WOLF
          </Button>
        ) : (
          <Button
            className="w-full"
            loading={stakePending || stakeConfirming}
            onClick={handleStake}
            disabled={!amount || Number(amount) <= 0 || !ADDRESSES.staking}
          >
            Stake WOLF
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RewardsPanel() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  // User staking info
  const { data: userInfo, refetch: refetchInfo } = useReadContract({
    address:      ADDRESSES.staking,
    abi:          STAKING_ABI,
    functionName: "userInfo",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && !!ADDRESSES.staking },
  });

  const { data: pending, refetch: refetchPending } = useReadContract({
    address:      ADDRESSES.staking,
    abi:          STAKING_ABI,
    functionName: "pendingRewards",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && !!ADDRESSES.staking, refetchInterval: 10_000 },
  });

  const { writeContract: unstake, data: unstakeTx, isPending: unstakePending } = useWriteContract();
  const { isLoading: unstakeConfirming } = useWaitForTransactionReceipt({
    hash: unstakeTx,
    onReplaced: () => { refetchInfo(); refetchPending(); },
  });

  const { writeContract: claim, data: claimTx, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({
    hash: claimTx,
    onReplaced: () => { refetchPending(); },
  });

  const { writeContract: emergency } = useWriteContract();

  const [unstakeAmount, setUnstakeAmount] = useState("");

  const stakedAmount = userInfo ? (userInfo as [bigint, bigint])[0] : 0n;
  const pendingRewards = (pending as bigint | undefined) ?? 0n;

  function handleUnstake() {
    if (!unstakeAmount) return;
    unstake({
      address:      ADDRESSES.staking,
      abi:          STAKING_ABI,
      functionName: "unstake",
      args:         [parseEther(unstakeAmount)],
    });
  }

  function handleClaim() {
    claim({
      address:      ADDRESSES.staking,
      abi:          STAKING_ABI,
      functionName: "claim",
      args:         [],
    });
  }

  function handleEmergency() {
    emergency({
      address:      ADDRESSES.staking,
      abi:          STAKING_ABI,
      functionName: "emergencyUnstake",
      args:         [],
    });
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader><CardTitle>Your Position</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 gap-4 text-center">
            <p className="text-text-muted text-sm">Connect your wallet to see your staking position.</p>
            <Button onClick={() => connect({ connector: injected() })}>Connect Wallet</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Your Position</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-bg-elevated p-4">
            <p className="text-xs text-text-muted mb-1">Staked</p>
            <p className="text-lg font-bold text-text-primary">
              {Number(formatEther(stakedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-text-muted">WOLF</p>
          </div>
          <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 p-4">
            <p className="text-xs text-text-muted mb-1">Pending Rewards</p>
            <p className="text-lg font-bold text-accent-green">
              {formatCRO(pendingRewards)}
            </p>
            <p className="text-xs text-text-muted">CRO</p>
          </div>
        </div>

        {/* Claim */}
        {pendingRewards > 0n && (
          <Button
            className="w-full"
            variant="success"
            loading={claimPending || claimConfirming}
            onClick={handleClaim}
          >
            <Gift size={15} />
            Claim {formatCRO(pendingRewards)} CRO
          </Button>
        )}

        {claimSuccess && (
          <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-4 py-3 text-sm text-accent-green">
            Rewards claimed!
          </div>
        )}

        {/* Unstake */}
        {stakedAmount > 0n && (
          <div className="space-y-3 border-t border-border pt-4">
            <Input
              type="number"
              label="Amount to unstake"
              placeholder="0.0"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              suffix="WOLF"
            />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Staked: {Number(formatEther(stakedAmount)).toLocaleString(undefined, { maximumFractionDigits: 2 })} WOLF</span>
              <button className="text-accent-purple-light hover:underline" onClick={() => setUnstakeAmount(formatEther(stakedAmount))}>
                MAX
              </button>
            </div>
            <Button
              className="w-full"
              variant="secondary"
              loading={unstakePending || unstakeConfirming}
              onClick={handleUnstake}
              disabled={!unstakeAmount || Number(unstakeAmount) <= 0}
            >
              Unstake WOLF
            </Button>
          </div>
        )}

        {/* Emergency */}
        {stakedAmount > 0n && (
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer flex items-center gap-1 hover:text-text-primary transition-colors">
              <AlertTriangle size={11} />
              Emergency unstake (forfeits pending rewards)
            </summary>
            <Button
              variant="danger"
              size="sm"
              className="mt-2 w-full"
              onClick={handleEmergency}
            >
              Emergency Unstake All
            </Button>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEvents() {
  const { data, isLoading } = useQuery({
    queryKey: ["staking-events"],
    queryFn:  () => fetchStakingEvents({ limit: 20 }),
    refetchInterval: 15_000,
  });

  const TYPE_COLORS: Record<string, string> = {
    stake:   "text-accent-purple",
    unstake: "text-accent-red",
    claim:   "text-accent-green",
    fees:    "text-accent-amber",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <span className="text-xs text-text-muted">{data?.total ?? 0} events</span>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No staking events yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {data?.data.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`text-xs font-medium capitalize w-14 ${TYPE_COLORS[ev.eventType] ?? "text-text-muted"}`}>
                  {ev.eventType}
                </span>
                <span className="flex-1 text-sm font-medium text-text-primary">
                  {ev.eventType === "fees"
                    ? `${formatCRO(ev.amount)} CRO distributed`
                    : `${Number(formatEther(BigInt(ev.amount))).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ev.eventType === "claim" ? "CRO" : "WOLF"}`}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {shortAddress(ev.user ?? ev.from ?? "")}
                </span>
                <a
                  href={`https://testnet.cronoscan.com/tx/${ev.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-accent-purple-light transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
                <span className="text-xs text-text-muted w-16 text-right shrink-0">
                  {timeAgo(ev.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StakingPage() {
  return (
    <div className="page-container py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-2">
          <Coins size={28} className="text-accent-purple" />
          WOLF Staking
        </h1>
        <p className="text-text-secondary">
          Stake WOLF tokens to earn a share of all bonding-curve and NFT platform fees, paid in CRO.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 px-5 py-4 mb-8 text-sm text-accent-cyan">
        <Info size={16} className="shrink-0 mt-0.5" />
        <p>
          Rewards accumulate in real time. Every buy, sell, and NFT mint sends 1% to this pool.
          Your share is proportional to your staked WOLF.
        </p>
      </div>

      {/* Global stats */}
      <GlobalStats />

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StakePanel />
        <RewardsPanel />
      </div>

      {/* Activity */}
      <RecentEvents />
    </div>
  );
}