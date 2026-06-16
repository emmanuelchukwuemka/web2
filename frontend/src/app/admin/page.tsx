"use client";

import { useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import {
  Zap, Image as ImageIcon, Coins, DollarSign,
  TrendingUp, PauseCircle, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CONTROLLER_ABI, STAKING_ABI, TOKEN_FACTORY_ADMIN_ABI, ADDRESSES } from "@/lib/contracts";
import { fetchTokens, fetchCollections, fetchStakingStats } from "@/lib/api";
import { formatCRO, shortAddress } from "@/lib/utils";

function useOnChainOverview() {
  return useReadContracts({
    contracts: [
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "paused"              },
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "feeBps"              },
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "creationFee"         },
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "nftCreationFee"      },
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "graduationThreshold" },
      { address: ADDRESSES.controller,   abi: CONTROLLER_ABI,          functionName: "treasury"            },
      { address: ADDRESSES.tokenFactory, abi: TOKEN_FACTORY_ADMIN_ABI, functionName: "totalTokens"         },
      { address: ADDRESSES.staking,      abi: STAKING_ABI,             functionName: "totalStaked"         },
    ],
    query: { enabled: !!ADDRESSES.controller },
  });
}

export default function AdminDashboard() {
  const { data: chain, isLoading: chainLoading } = useOnChainOverview();

  const { data: tokensData }   = useQuery({ queryKey: ["tokens-admin"],    queryFn: () => fetchTokens({ limit: 1 }) });
  const { data: nftsData }     = useQuery({ queryKey: ["nfts-admin"],      queryFn: () => fetchCollections({ limit: 1 }) });
  const { data: stakingStats } = useQuery({ queryKey: ["staking-stats"],   queryFn: fetchStakingStats });

  const [paused, feeBps, creationFee, nftCreationFee, gradThreshold, treasury, totalTokens, totalStaked] =
    chain?.map((r) => r.result) ?? [];

  const isPaused      = paused as boolean | undefined;
  const feePct        = feeBps !== undefined ? `${Number(feeBps) / 100}%` : "—";
  const createFeeCRO  = creationFee !== undefined ? `${formatEther(creationFee as bigint)} CRO` : "—";
  const nftFeeCRO     = nftCreationFee !== undefined ? `${formatEther(nftCreationFee as bigint)} CRO` : "—";
  const gradThreshCRO = gradThreshold !== undefined ? `${formatEther(gradThreshold as bigint)} CRO` : "—";
  const treasuryAddr  = treasury as string | undefined;
  const totalStakedFmt = totalStaked !== undefined
    ? `${Number(formatEther(totalStaked as bigint)).toLocaleString(undefined, { maximumFractionDigits: 0 })} WOLF`
    : "—";

  if (chainLoading) {
    return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">Live platform overview</p>
        </div>
        <div className="flex items-center gap-2">
          {isPaused !== undefined && (
            isPaused
              ? <Badge variant="red" className="gap-1.5"><PauseCircle size={12} /> Platform Paused</Badge>
              : <Badge variant="green" className="gap-1.5"><CheckCircle2 size={12} /> Platform Live</Badge>
          )}
        </div>
      </div>

      {/* Platform stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tokens Launched",   value: tokensData?.total.toLocaleString() ?? "—",  icon: Zap,       color: "text-accent-purple" },
          { label: "NFT Collections",   value: nftsData?.total.toLocaleString()   ?? "—",  icon: ImageIcon, color: "text-accent-cyan"   },
          { label: "Total WOLF Staked", value: totalStakedFmt,                             icon: Coins,     color: "text-accent-green"  },
          { label: "Fees Distributed",  value: stakingStats ? `${formatCRO(stakingStats.totalFeesDistributed)} CRO` : "—", icon: DollarSign, color: "text-accent-amber" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card flex items-center gap-3">
            <div className={`rounded-lg bg-bg-primary p-2 ${color}`}><Icon size={16} /></div>
            <div>
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-base font-bold text-text-primary">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contract config snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controller params */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <TrendingUp size={15} className="text-accent-purple" />
            <h2 className="font-semibold text-text-primary text-sm">Controller Parameters</h2>
          </div>
          <CardContent className="space-y-0 p-0">
            {[
              { label: "Protocol Fee",          value: feePct        },
              { label: "Token Creation Fee",     value: createFeeCRO  },
              { label: "NFT Creation Fee",       value: nftFeeCRO     },
              { label: "Graduation Threshold",   value: gradThreshCRO },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm text-text-muted">{label}</span>
                <span className="text-sm font-medium text-text-primary">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <CheckCircle2 size={15} className="text-accent-green" />
            <h2 className="font-semibold text-text-primary text-sm">Contract Addresses</h2>
          </div>
          <CardContent className="space-y-0 p-0">
            {[
              { label: "Controller",    value: ADDRESSES.controller   },
              { label: "TokenFactory",  value: ADDRESSES.tokenFactory },
              { label: "NFTFactory",    value: ADDRESSES.nftFactory   },
              { label: "Staking",       value: ADDRESSES.staking      },
              { label: "Treasury",      value: (treasuryAddr ?? "—")  },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3 border-b border-border last:border-0">
                <span className="text-sm text-text-muted">{label}</span>
                <span className="text-xs font-mono text-text-primary">
                  {value ? shortAddress(value) : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}