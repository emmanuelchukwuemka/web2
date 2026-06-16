"use client";

import { useState } from "react";
import { parseEther, formatEther, isAddress } from "viem";
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CheckCircle2, PauseCircle, PlayCircle, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { CONTROLLER_ABI, ADDRESSES } from "@/lib/contracts";

// ── Reusable field component ──────────────────────────────────────────────────

interface SettingFieldProps {
  label: string;
  description: string;
  currentValue: string;
  inputValue: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  placeholder?: string;
  suffix?: string;
}

function SettingField({
  label, description, currentValue, inputValue, onChange,
  onSave, saving, saved, placeholder, suffix,
}: SettingFieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-5 border-b border-border last:border-0">
      <div className="sm:w-64 shrink-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
        <p className="text-xs text-text-muted mt-1">
          Current: <span className="text-accent-cyan font-mono">{currentValue}</span>
        </p>
      </div>
      <div className="flex-1 flex gap-2 items-end">
        <Input
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? currentValue}
          suffix={suffix}
        />
        <Button
          size="md"
          variant="secondary"
          className="shrink-0 gap-1.5"
          loading={saving}
          onClick={onSave}
          disabled={!inputValue}
        >
          {saved ? <CheckCircle2 size={14} className="text-accent-green" /> : <Save size={14} />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ── Tx hook wrapper ───────────────────────────────────────────────────────────

function useTx() {
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  return { writeContract, isPending: isPending || confirming, isSuccess, reset };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  // Read current values
  const { data: reads, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "paused"              },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "feeBps"              },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "creationFee"         },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "nftCreationFee"      },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "graduationThreshold" },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "antiBotBlocks"       },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "antiBotMaxBps"       },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "buyCooldown"         },
      { address: ADDRESSES.controller, abi: CONTROLLER_ABI, functionName: "treasury"            },
    ],
    query: { enabled: !!ADDRESSES.controller },
  });

  const [
    rawPaused, rawFeeBps, rawCreateFee, rawNftFee,
    rawGradThresh, rawAntiBotBlocks, rawAntiBotBps, rawCooldown, rawTreasury,
  ] = reads?.map((r) => r.result) ?? [];

  const isPaused = rawPaused as boolean | undefined;

  // Individual tx hooks
  const feeTx      = useTx();
  const createTx   = useTx();
  const nftTx      = useTx();
  const gradTx     = useTx();
  const antiBotTx  = useTx();
  const treasuryTx = useTx();
  const pauseTx    = useTx();

  // Field state
  const [feeBpsInput,     setFeeBpsInput]     = useState("");
  const [createFeeInput,  setCreateFeeInput]  = useState("");
  const [nftFeeInput,     setNftFeeInput]     = useState("");
  const [gradThreshInput, setGradThreshInput] = useState("");
  const [antiBotBlocks,   setAntiBotBlocks]   = useState("");
  const [antiBotBps,      setAntiBotBps]      = useState("");
  const [cooldown,        setCooldown]        = useState("");
  const [treasuryInput,   setTreasuryInput]   = useState("");
  const [error,           setError]           = useState("");

  function safeParseEther(val: string): bigint | null {
    try { return parseEther(val); } catch { return null; }
  }

  function save(fn: () => void) {
    setError("");
    try { fn(); } catch (e: unknown) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Unknown error");
    }
  }

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner size="lg" /></div>;

  const cur = {
    feeBps:    rawFeeBps  !== undefined ? `${Number(rawFeeBps) / 100}%` : "—",
    createFee: rawCreateFee !== undefined ? `${formatEther(rawCreateFee as bigint)} CRO` : "—",
    nftFee:    rawNftFee !== undefined ? `${formatEther(rawNftFee as bigint)} CRO` : "—",
    gradThresh: rawGradThresh !== undefined ? `${formatEther(rawGradThresh as bigint)} CRO` : "—",
    antiBotBlocks: rawAntiBotBlocks?.toString() ?? "—",
    antiBotBps:    rawAntiBotBps !== undefined ? `${Number(rawAntiBotBps) / 100}%` : "—",
    cooldown:  rawCooldown?.toString() ?? "—",
    treasury:  (rawTreasury as string | undefined) ?? "—",
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Platform Settings</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage LaunchpadController parameters</p>
      </div>

      {error && (
        <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {/* ── Pause / Unpause ── */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-text-primary text-sm">Platform Status</h2>
            {isPaused !== undefined && (
              isPaused
                ? <Badge variant="red" className="gap-1"><PauseCircle size={11} /> Paused</Badge>
                : <Badge variant="green" className="gap-1"><CheckCircle2 size={11} /> Live</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={isPaused ? "success" : "danger"}
            loading={pauseTx.isPending}
            className="gap-1.5"
            onClick={() => {
              pauseTx.writeContract({
                address:      ADDRESSES.controller,
                abi:          CONTROLLER_ABI,
                functionName: isPaused ? "unpause" : "pause",
                args:         [],
              });
            }}
          >
            {isPaused
              ? <><PlayCircle size={14} /> Unpause Platform</>
              : <><PauseCircle size={14} /> Pause Platform</>}
          </Button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-text-muted">
            Pausing halts all <code className="text-text-primary">buy()</code>,
            {" "}<code className="text-text-primary">sell()</code>,
            {" "}<code className="text-text-primary">createToken()</code>, and
            {" "}<code className="text-text-primary">createCollection()</code> calls.
            Emergency unstake on the Staking contract is unaffected.
          </p>
        </div>
      </Card>

      {/* ── Fee settings ── */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary text-sm">Fee Configuration</h2>
        </div>
        <CardContent className="p-0">
          <SettingField
            label="Protocol Fee"
            description="Deducted from every buy and sell. Max 10% (1000 bps)."
            currentValue={cur.feeBps}
            inputValue={feeBpsInput}
            onChange={setFeeBpsInput}
            placeholder="100"
            suffix="bps"
            saving={feeTx.isPending}
            saved={feeTx.isSuccess}
            onSave={() => save(() => feeTx.writeContract({
              address: ADDRESSES.controller, abi: CONTROLLER_ABI,
              functionName: "setFeeBps", args: [BigInt(feeBpsInput)],
            }))}
          />
          <SettingField
            label="Token Creation Fee"
            description="CRO paid to treasury when launching a new token."
            currentValue={cur.createFee}
            inputValue={createFeeInput}
            onChange={setCreateFeeInput}
            placeholder="10"
            suffix="CRO"
            saving={createTx.isPending}
            saved={createTx.isSuccess}
            onSave={() => {
              const v = safeParseEther(createFeeInput);
              if (!v) return setError("Invalid CRO amount");
              save(() => createTx.writeContract({
                address: ADDRESSES.controller, abi: CONTROLLER_ABI,
                functionName: "setCreationFee", args: [v],
              }));
            }}
          />
          <SettingField
            label="NFT Creation Fee"
            description="CRO paid to treasury when deploying an NFT collection."
            currentValue={cur.nftFee}
            inputValue={nftFeeInput}
            onChange={setNftFeeInput}
            placeholder="5"
            suffix="CRO"
            saving={nftTx.isPending}
            saved={nftTx.isSuccess}
            onSave={() => {
              const v = safeParseEther(nftFeeInput);
              if (!v) return setError("Invalid CRO amount");
              save(() => nftTx.writeContract({
                address: ADDRESSES.controller, abi: CONTROLLER_ABI,
                functionName: "setNftCreationFee", args: [v],
              }));
            }}
          />
        </CardContent>
      </Card>

      {/* ── Graduation threshold ── */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary text-sm">Graduation Threshold</h2>
        </div>
        <CardContent className="p-0">
          <SettingField
            label="CRO Required to Graduate"
            description="When realCroRaised reaches this, the curve deposits LP to VVS Finance."
            currentValue={cur.gradThresh}
            inputValue={gradThreshInput}
            onChange={setGradThreshInput}
            placeholder="500"
            suffix="CRO"
            saving={gradTx.isPending}
            saved={gradTx.isSuccess}
            onSave={() => {
              const v = safeParseEther(gradThreshInput);
              if (!v) return setError("Invalid CRO amount");
              save(() => gradTx.writeContract({
                address: ADDRESSES.controller, abi: CONTROLLER_ABI,
                functionName: "setGraduationThreshold", args: [v],
              }));
            }}
          />
        </CardContent>
      </Card>

      {/* ── Anti-bot ── */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary text-sm">Anti-Bot Parameters</h2>
          <p className="text-xs text-text-muted mt-0.5">All three fields are saved together in a single transaction.</p>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Anti-Bot Blocks"
              placeholder={cur.antiBotBlocks}
              value={antiBotBlocks}
              onChange={(e) => setAntiBotBlocks(e.target.value)}
              hint="Blocks after launch"
            />
            <Input
              label="Max Wallet (bps)"
              placeholder={rawAntiBotBps?.toString() ?? "500"}
              value={antiBotBps}
              onChange={(e) => setAntiBotBps(e.target.value)}
              hint={`Current: ${cur.antiBotBps}`}
            />
            <Input
              label="Buy Cooldown (s)"
              placeholder={cur.cooldown}
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              hint="Seconds between buys"
            />
          </div>
          <Button
            variant="secondary"
            loading={antiBotTx.isPending}
            className="gap-1.5"
            onClick={() => save(() => antiBotTx.writeContract({
              address: ADDRESSES.controller, abi: CONTROLLER_ABI,
              functionName: "setAntiBotParams",
              args: [
                BigInt(antiBotBlocks || rawAntiBotBlocks?.toString() || "0"),
                BigInt(antiBotBps    || rawAntiBotBps?.toString()    || "0"),
                BigInt(cooldown      || rawCooldown?.toString()      || "0"),
              ],
            }))}
          >
            {antiBotTx.isSuccess
              ? <><CheckCircle2 size={14} className="text-accent-green" /> Saved</>
              : <><Save size={14} /> Save Anti-Bot Params</>}
          </Button>
        </CardContent>
      </Card>

      {/* ── Treasury ── */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary text-sm">Treasury Address</h2>
        </div>
        <CardContent className="p-0">
          <SettingField
            label="Fee Destination"
            description="All protocol fees are forwarded here. Point to the Staking contract to distribute to WOLF stakers."
            currentValue={cur.treasury}
            inputValue={treasuryInput}
            onChange={setTreasuryInput}
            placeholder="0x…"
            saving={treasuryTx.isPending}
            saved={treasuryTx.isSuccess}
            onSave={() => {
              if (!isAddress(treasuryInput)) return setError("Invalid address");
              save(() => treasuryTx.writeContract({
                address: ADDRESSES.controller, abi: CONTROLLER_ABI,
                functionName: "setTreasury", args: [treasuryInput as `0x${string}`],
              }));
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}