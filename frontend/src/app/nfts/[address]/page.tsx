import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MintPanel } from "@/components/nfts/MintPanel";
import { fetchCollection } from "@/lib/api";
import { shortAddress, explorerAddress } from "@/lib/utils";

interface Props { params: { address: string } }

async function CollectionHeader({ address }: { address: string }) {
  let collection;
  try { collection = await fetchCollection(address); }
  catch {
    return <p className="text-text-muted">Collection not found.</p>;
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Banner */}
      <div className="h-40 bg-gradient-to-br from-accent-purple/20 via-bg-elevated to-accent-cyan/10 flex items-center justify-center">
        <ImageIcon size={40} className="text-text-muted opacity-20" />
      </div>
      {/* Info */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{collection.name}</h1>
              <Badge variant="cyan">{collection.symbol}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
              <span>Created by {shortAddress(collection.creator)}</span>
              <a href={explorerAddress(collection.address, true)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-accent-purple-light transition-colors">
                <ExternalLink size={12} />
                Cronoscan
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-text-muted text-xs mb-0.5">Max Supply</p>
              <p className="font-semibold text-text-primary">{collection.maxSupply.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted text-xs mb-0.5">Contract</p>
              <p className="font-mono text-text-primary text-xs">{shortAddress(collection.address)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function NFTDetailPage({ params }: Props) {
  const { address } = params;

  return (
    <div className="page-container py-8">
      <Link href="/nfts" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors">
        <ChevronLeft size={15} />
        Back to NFTs
      </Link>

      <div className="mb-6">
        <Suspense fallback={<div className="h-56 rounded-xl bg-bg-card animate-pulse" />}>
          <CollectionHeader address={address} />
        </Suspense>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Placeholder for token gallery */}
        <div className="flex-1 rounded-xl border border-border bg-bg-card p-8 flex items-center justify-center">
          <p className="text-text-muted text-sm">Token gallery — connect indexer to see minted NFTs</p>
        </div>

        {/* Mint panel */}
        <div className="w-full xl:w-80 shrink-0">
          <MintPanel collectionAddress={address} />
        </div>
      </div>
    </div>
  );
}