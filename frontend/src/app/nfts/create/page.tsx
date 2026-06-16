"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Image as ImageIcon, CheckCircle, ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NFT_FACTORY_ABI, ADDRESSES } from "@/lib/contracts";
import { explorerTx } from "@/lib/utils";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const NFT_CREATION_FEE = parseEther("5");

export default function NFTCreatePage() {
  const [name,      setName]      = useState("");
  const [symbol,    setSymbol]    = useState("");
  const [baseURI,   setBaseURI]   = useState("");
  const [maxSupply, setMaxSupply] = useState("1000");
  const [mintPrice, setMintPrice] = useState("0");
  const [maxWallet, setMaxWallet] = useState("5");
  const [royaltyBps, setRoyaltyBps] = useState("500");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())   e.name     = "Required";
    if (!symbol.trim()) e.symbol   = "Required";
    if (!Number(maxSupply) || Number(maxSupply) < 1) e.maxSupply = "Must be ≥ 1";
    if (Number(royaltyBps) > 1000) e.royaltyBps = "Max 10% (1000 bps)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCreate() {
    if (!validate() || !address) return;
    reset();

    const now   = BigInt(Math.floor(Date.now() / 1000));
    const far   = BigInt(9999999999);

    writeContract({
      address:      ADDRESSES.nftFactory,
      abi:          NFT_FACTORY_ABI,
      functionName: "createCollection",
      value:        NFT_CREATION_FEE,
      args: [{
        name:    name.trim(),
        symbol:  symbol.trim().toUpperCase(),
        baseURI: baseURI.trim(),
        config: {
          maxSupply:           BigInt(maxSupply),
          mintPrice:           parseEther(mintPrice || "0"),
          presaleMintPrice:    parseEther(mintPrice || "0"),
          maxPerWallet:        BigInt(maxWallet),
          presaleMaxPerWallet: BigInt(maxWallet),
          royaltyBps:          BigInt(royaltyBps),
          fundsReceiver:       address,
          presaleStart:        far,
          presaleEnd:          far,
          publicStart:         now,
          merkleRoot:          ZERO_BYTES32,
        },
      }],
    });
  }

  if (isSuccess) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-full bg-accent-green/10 border border-accent-green/20">
            <CheckCircle size={32} className="text-accent-green" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Collection Created! 🎉</h2>
          <p className="text-text-secondary mb-6">
            <span className="font-semibold text-text-primary">{name}</span> is now live.
          </p>
          {txHash && (
            <a href={explorerTx(txHash)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent-purple-light hover:underline mb-6">
              <ExternalLink size={14} />
              View on Cronoscan
            </a>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => { setName(""); setSymbol(""); reset(); }}>
              Create Another
            </Button>
            <Button className="flex-1" onClick={() => window.location.href = "/nfts"}>
              Browse NFTs
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <Link href="/nfts" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-6">
        <ChevronLeft size={15} />
        Back to NFTs
      </Link>

      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-2">
            <ImageIcon size={28} className="text-accent-cyan" />
            Create NFT Collection
          </h1>
          <p className="text-text-secondary">
            Deploy your own ERC-721A collection with Merkle allowlist, presale, and royalties.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Collection Name" placeholder="Wolf Pack" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Input label="Symbol" placeholder="WPACK" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} error={errors.symbol} />
            </div>

            <Input
              label="Base URI"
              placeholder="ipfs://Qm…/"
              value={baseURI}
              onChange={(e) => setBaseURI(e.target.value)}
              hint="IPFS or HTTPS URI for metadata (append token ID)"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Max Supply" type="number" min="1" value={maxSupply} onChange={(e) => setMaxSupply(e.target.value)} error={errors.maxSupply} />
              <Input label="Mint Price (CRO)" type="number" min="0" step="0.1" value={mintPrice} onChange={(e) => setMintPrice(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Max Per Wallet" type="number" min="1" value={maxWallet} onChange={(e) => setMaxWallet(e.target.value)} />
              <Input label="Royalty (bps)" type="number" min="0" max="1000" value={royaltyBps} onChange={(e) => setRoyaltyBps(e.target.value)} hint="500 = 5%" error={errors.royaltyBps} />
            </div>

            {/* Fee */}
            <div className="rounded-lg border border-border bg-bg-card p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Creation fee</span>
                <span className="font-semibold text-text-primary">5 CRO</span>
              </div>
            </div>

            {writeError && (
              <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
                {writeError.message.split("\n")[0]}
              </div>
            )}

            {!isConnected ? (
              <Button className="w-full" size="lg" onClick={() => connect({ connector: injected() })}>
                Connect Wallet
              </Button>
            ) : (
              <Button className="w-full" size="lg" loading={isPending || confirming} onClick={handleCreate} disabled={!ADDRESSES.nftFactory}>
                {confirming ? "Confirming…" : isPending ? "Waiting for wallet…" : "Create Collection — 5 CRO"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}