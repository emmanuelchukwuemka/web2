import Link from "next/link";
import { Image as ImageIcon, Users, ArrowUpRight } from "lucide-react";
import { type NFTCollection } from "@/lib/api";
import { shortAddress, timeAgo } from "@/lib/utils";

interface CollectionCardProps {
  collection: NFTCollection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link href={`/nfts/${collection.address}`}>
      <div className="group rounded-xl border border-border bg-bg-card overflow-hidden transition-all duration-200 hover:border-accent-purple/40 hover:shadow-card cursor-pointer">
        {/* Banner placeholder */}
        <div className="relative h-32 bg-gradient-to-br from-accent-purple/20 via-bg-elevated to-accent-cyan/10 flex items-center justify-center">
          <ImageIcon size={32} className="text-text-muted opacity-30" />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight size={16} className="text-text-muted" />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <p className="font-semibold text-text-primary">{collection.name}</p>
            <p className="text-xs text-text-muted">{collection.symbol}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-text-muted mb-0.5">Max Supply</p>
              <p className="font-medium text-text-primary">{collection.maxSupply.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-muted mb-0.5">Creator</p>
              <p className="font-medium text-text-primary font-mono">{shortAddress(collection.creator)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {timeAgo(collection.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}