"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { PauseCircle, PlayCircle, Coins, CheckCircle2, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { STAKING_ABI, ADDRESSES } from "@/lib/contracts";
import { fetchStakingStats, fetchStakingEvents } from "@/lib/api";
import { formatCRO, shortAddress, timeAgo } from "@/lib/utils";

function useTx() {
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  return { writeContract, isPending: isPending || confirming, isSuccess, reset };
}

export default function AdminStakingPage() {
  const [depositAmount, setDepositAmount] = useState("");
  const [error, setError] = useState("");

  const { data: reads, isLoading } = useReadContracts({
    contracts: [
      { address: ADDRESSES.staking, abi: STAKING_ABI, functionName: "totalStaked" },
    ],
    query: { enabled: !!ADDRESSES.staking },
  });

  const [totalStaked] = reads?.map((r) => r.result) ?? [];

  const { data: stats }  = useQuery({ queryKey: ["staking-stats"],    queryFn: fetchStakingStats, refetchInterval: 10_000 });
  const { data: events } = useQuery({ queryKey: ["staking-events-admin"], queryFn: () => fetchStakingEvents({ limit: 30 }), refetchInterval: 10_000 });

  const pauseTx   = useTx();
  const depositTx = useTx();

  function handleDeposit() {
    setError("");
    if (!depositAmount || Number(depositAmount) <= 0) return setError("Enter a CRO amount");
    try {
      depositTx.reset();
      depositTx.writeContract({
        address:      ADDRESSES.staking,
        abi:          STAKING_ABI,
        functionName: "depositFees",
        args:         [],
        value:        parseEther(depositAmount),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Unknown error");
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    stake:   "text-accent-purple",
    unstake: "text-accent-red",
    claim:   "text-accent-green",
    fees:    "text-accent-amber",
  };

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Staking Admin</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage the WOLF staking contract</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Staked",
            value: totalStaked !== undefined
              ? `${Number(formatEther(totalStaked as bigint)).toLocaleString(undefined, { maximumFractionDigits: 0 })} WOLF`
              : "—",
            icon: Coins,
            color: "text-accent-purple",
          },
          {
            label: "Total Fees Distributed",
            value: stats ? `${formatCRO(stats.totalFeesDistributed)} CRO` : "—",
            icon: DollarSign,
            color: "text-accent-green",
          },
          {
            label: "Stake Events",
            value: (stats?.eventCounts["stake"] ?? 0).toLocaleString(),
            icon: CheckCircle2,
            color: "text-accent-cyan",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card flex items-center gap-3">
            <div className={`rounded-lg bg-bg-primary p-2 ${color}`}><Icon size={16} /></div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-sm font-bold text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pause / Unpause */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-text-primary text-sm">Staking Status</h2>
            <Badge variant="green" className="gap-1"><CheckCircle2 size={10} /> Active</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm" variant="danger"
              loading={pauseTx.isPending}
              className="gap-1.5"
              onClick={() => pauseTx.writeContract({
                address: ADDRESSES.staking, abi: STAKING_ABI,
                functionName: "pause", args: [],
              })}
            >
              <PauseCircle size={14} /> Pause
            </Button>
            <Button
              size="sm" variant="success"
              loading={pauseTx.isPending}
              className="gap-1.5"
              onClick={() => pauseTx.writeContract({
                address: ADDRESSES.staking, abi: STAKING_ABI,
                functionName: "unpause", args: [],
              })}
            >
              <PlayCircle size={14} /> Unpause
            </Button>
          </div>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-text-muted">
            Pausing blocks <code className="text-text-primary">stake()</code>,{" "}
            <code className="text-text-primary">unstake()</code>, and{" "}
            <code className="text-text-primary">claim()</code>.{" "}
            Emergency unstake is always available to users regardless of pause state.
          </p>
        </div>
      </Card>

      {/* Manual fee deposit */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <DollarSign size={15} className="text-accent-amber" />
          <h2 className="font-semibold text-text-primary text-sm">Deposit Fees Manually</h2>
        </div>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-muted">
            Send CRO directly to the staking pool. Normally the treasury does this automatically,
            but you can sweep accumulated fees here at any time.
          </p>

          <div className="flex gap-3 items-end">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.1"
              placeholder="0.0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              suffix="CRO"
              error={error}
            />
            <Button
              loading={depositTx.isPending}
              onClick={handleDeposit}
              className="shrink-0 gap-1.5"
              disabled={!depositAmount || !ADDRESSES.staking}
            >
              {depositTx.isSuccess
                ? <><CheckCircle2 size={14} /> Deposited!</>
                : <><DollarSign size={14} /> Deposit Fees</>}
            </Button>
          </div>

          {depositTx.isSuccess && (
            <p className="text-sm text-accent-green">
              {depositAmount} CRO deposited and distributed to all current stakers.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent staking activity */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-text-primary text-sm">Recent Activity</h2>
          <span className="text-xs text-text-muted">{events?.total ?? 0} total events</span>
        </div>
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {(events?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No staking events yet.</p>
          ) : events?.data.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`text-xs font-semibold capitalize w-14 ${TYPE_COLOR[ev.eventType] ?? "text-text-muted"}`}>
                {ev.eventType}
              </span>
              <span className="flex-1 text-sm text-text-primary">
                {ev.eventType === "fees"
                  ? `${formatCRO(ev.amount)} CRO distributed`
                  : ev.eventType === "claim"
                  ? `${formatCRO(ev.amount)} CRO claimed`
                  : `${Number(formatEther(BigInt(ev.amount))).toLocaleString(undefined, { maximumFractionDigits: 2 })} WOLF`}
              </span>
              <span className="text-xs font-mono text-text-muted">
                {shortAddress(ev.user ?? ev.from ?? "")}
              </span>
              <span className="text-xs text-text-muted w-16 text-right shrink-0">
                {timeAgo(ev.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}