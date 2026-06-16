"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { parseEther } from "viem";
import { decodeEventLog } from "viem";
import {
  useWriteContract, useWaitForTransactionReceipt,
  useReadContract, useAccount, useConnect,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { Zap, Info, CheckCircle, ExternalLink, Upload, X, Globe, Twitter, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { TOKEN_FACTORY_ABI, ADDRESSES } from "@/lib/contracts";
import { explorerTx, explorerAddress } from "@/lib/utils";
import { uploadToIPFS, updateTokenMetadata } from "@/lib/api";

const CREATION_FEE = parseEther("10");

const TOKEN_CREATED_ABI = [
  {
    name: "TokenCreated",
    type: "event",
    inputs: [
      { name: "token",     type: "address", indexed: true  },
      { name: "curve",     type: "address", indexed: true  },
      { name: "creator",   type: "address", indexed: true  },
      { name: "name",      type: "string",  indexed: false },
      { name: "symbol",    type: "string",  indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export default function LaunchPage() {
  const [name,        setName]        = useState("");
  const [symbol,      setSymbol]      = useState("");
  const [description, setDescription] = useState("");
  const [website,     setWebsite]     = useState("");
  const [twitter,     setTwitter]     = useState("");
  const [telegram,    setTelegram]    = useState("");
  const [discord,     setDiscord]     = useState("");

  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl,     setImageUrl]     = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState("");

  const [createdAddr,  setCreatedAddr]  = useState<string | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  const { isConnected } = useAccount();
  const { connect }     = useConnect();

  const { data: totalTokens } = useReadContract({
    address:      ADDRESSES.tokenFactory,
    abi:          TOKEN_FACTORY_ABI,
    functionName: "totalTokens",
  });

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Once tx confirmed, extract token address from event log and post metadata
  useEffect(() => {
    if (!isSuccess || !receipt) return;

    let tokenAddress: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi:    TOKEN_CREATED_ABI,
          data:   log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TokenCreated") {
          tokenAddress = (decoded.args as { token: string }).token;
          break;
        }
      } catch { /* not the right event */ }
    }

    setCreatedAddr(tokenAddress);

    if (tokenAddress && (imageUrl || description || website || twitter || telegram || discord)) {
      updateTokenMetadata(tokenAddress, {
        ...(imageUrl     && { image:       imageUrl }),
        ...(description  && { description: description }),
        ...(website      && { website:     website }),
        ...(twitter      && { twitter:     twitter }),
        ...(telegram     && { telegram:    telegram }),
        ...(discord      && { discord:     discord }),
      }).catch(console.error);
    }
  }, [isSuccess, receipt, imageUrl, description, website, twitter, telegram, discord]);

  const handleImageChange = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("File must be an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB");
      return;
    }
    setUploadError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Upload to Pinata immediately so the URL is ready when the tx confirms
    setUploading(true);
    try {
      const url = await uploadToIPFS(file);
      setImageUrl(url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setImageUrl(null);
    } finally {
      setUploading(false);
    }
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())   e.name   = "Name is required";
    if (!symbol.trim()) e.symbol = "Symbol is required";
    if (symbol.length > 8) e.symbol = "Symbol must be 8 characters or less";
    if (!/^[A-Z0-9]+$/i.test(symbol)) e.symbol = "Symbol: letters and numbers only";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleLaunch() {
    if (!validate()) return;
    reset();
    writeContract({
      address:      ADDRESSES.tokenFactory,
      abi:          TOKEN_FACTORY_ABI,
      functionName: "createToken",
      args:         [name.trim(), symbol.trim().toUpperCase()],
      value:        CREATION_FEE,
    });
  }

  if (isSuccess) {
    return (
      <div className="page-container py-16 flex justify-center">
        <Card className="w-full max-w-md text-center p-8">
          <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-full bg-accent-green/10 border border-accent-green/20">
            {imagePreview
              ? <img src={imagePreview} alt="" className="h-16 w-16 rounded-full object-cover" />
              : <CheckCircle size={32} className="text-accent-green" />}
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Token Launched!</h2>
          <p className="text-text-secondary mb-6">
            <span className="font-semibold text-text-primary">${symbol.toUpperCase()}</span> is now live on the bonding curve.
          </p>
          {txHash && (
            <a href={explorerTx(txHash)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent-purple-light hover:underline mb-2">
              <ExternalLink size={14} /> View transaction on Cronoscan
            </a>
          )}
          {createdAddr && (
            <a href={explorerAddress(createdAddr)} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-accent-cyan hover:underline mb-6">
              <ExternalLink size={14} /> View token contract
            </a>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" className="flex-1"
              onClick={() => { setName(""); setSymbol(""); setDescription(""); setImageFile(null); setImagePreview(null); setImageUrl(null); reset(); }}>
              Launch Another
            </Button>
            <Button className="flex-1"
              onClick={() => createdAddr
                ? (window.location.href = `/tokens/${createdAddr}`)
                : (window.location.href = "/tokens")}>
              {createdAddr ? "View Token" : "Browse Tokens"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-2">
            <Zap size={28} className="text-accent-purple" />
            Launch a Token
          </h1>
          <p className="text-text-secondary">
            Fair-launch token with a virtual-reserve bonding curve. No presales, no team allocations.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-5">

            {/* Image upload */}
            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Token Image <span className="text-text-muted font-normal">(optional)</span></p>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageChange(f); }}
                className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-accent-purple/40 bg-bg-elevated cursor-pointer transition-colors h-36"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="preview" className="h-full w-full object-cover rounded-xl opacity-80" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setImageUrl(null); }}
                      className="absolute top-2 right-2 rounded-full bg-bg-primary/80 p-1 text-text-muted hover:text-accent-red"
                    >
                      <X size={14} />
                    </button>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/60 rounded-xl">
                        <span className="text-xs text-text-primary">Uploading to IPFS…</span>
                      </div>
                    )}
                    {imageUrl && !uploading && (
                      <div className="absolute bottom-2 left-2 rounded-full bg-accent-green/20 px-2 py-0.5 text-xs text-accent-green">
                        Pinned to IPFS
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <Upload size={24} />
                    <span className="text-sm">Drop image or click to upload</span>
                    <span className="text-xs">PNG, JPG, GIF — max 5 MB</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageChange(f); }} />
              </div>
              {uploadError && <p className="mt-1 text-xs text-accent-red">{uploadError}</p>}
            </div>

            {/* Name + Symbol */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Token Name" placeholder="e.g. Moon Wolves"
                value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Input label="Ticker Symbol" placeholder="e.g. MWOLF"
                value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                error={errors.symbol} suffix="$" hint="2–8 chars" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Description <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tell people what this token is about…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/60 resize-none transition-colors"
              />
              <p className="text-right text-xs text-text-muted mt-0.5">{description.length}/500</p>
            </div>

            {/* Social links */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-text-primary">Social Links <span className="text-text-muted font-normal">(optional)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="https://yourwebsite.com" value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  prefix={<Globe size={14} className="text-text-muted" />} />
                <Input placeholder="@handle or URL" value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  prefix={<Twitter size={14} className="text-text-muted" />} />
                <Input placeholder="t.me/yourcommunity" value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  prefix={<Send size={14} className="text-text-muted" />} />
                <Input placeholder="discord.gg/invite" value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  prefix={<MessageCircle size={14} className="text-text-muted" />} />
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-border bg-bg-elevated p-4 space-y-2 text-sm text-text-muted">
              <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                <Info size={14} className="text-accent-cyan" />
                How it works
              </div>
              <ul className="space-y-1.5 text-xs pl-4 list-disc">
                <li>1,000,000,000 tokens minted to the bonding curve</li>
                <li>Virtual reserve of 10,000 CRO seeds the initial price</li>
                <li>Price rises with every buy; 1% fee goes to stakers</li>
                <li>At 500 CRO raised, liquidity is added to VVS Finance automatically</li>
              </ul>
            </div>

            {/* Fee summary */}
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Creation fee</span>
                <span className="font-semibold text-text-primary">10 CRO</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-text-muted">Total tokens launched</span>
                <span className="text-text-primary">{totalTokens?.toString() ?? "—"}</span>
              </div>
            </div>

            {writeError && (
              <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
                {writeError.message.split("\n")[0]}
              </div>
            )}

            {!isConnected ? (
              <Button className="w-full" size="lg" onClick={() => connect({ connector: injected() })}>
                Connect Wallet to Launch
              </Button>
            ) : (
              <Button
                className="w-full" size="lg"
                loading={isPending || confirming || uploading}
                onClick={handleLaunch}
                disabled={!ADDRESSES.tokenFactory || uploading}
              >
                {uploading       ? "Uploading image…"
                  : confirming   ? "Confirming transaction…"
                  : isPending    ? "Waiting for wallet…"
                  : "Launch Token — 10 CRO"}
              </Button>
            )}
            {!ADDRESSES.tokenFactory && (
              <p className="text-center text-xs text-text-muted">
                Contracts not yet deployed — set NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}