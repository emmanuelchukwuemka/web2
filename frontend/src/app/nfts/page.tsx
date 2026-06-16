"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/nfts/CollectionCard";
import { PageSpinner } from "@/components/ui/spinner";
import { fetchCollections } from "@/lib/api";

export default function NFTsPage() {
  const [page,   setPage]       = useState(1);
  const [inputValue, setInput]  = useState("");
  const [search, setSearch]     = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["collections", page, search],
    queryFn:  () => fetchCollections({ page, limit: 18, q: search || undefined }),
  });

  const totalPages = data ? Math.ceil(data.total / 18) : 1;

  return (
    <div className="page-container py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">NFT Collections</h1>
          <p className="text-text-secondary">
            {data ? `${data.total.toLocaleString()} collections launched` : "Browse all NFT collections"}
          </p>
        </div>
        <Link href="/nfts/create">
          <Button className="gap-2">
            <Plus size={15} />
            Create Collection
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6 max-w-md">
        <Input
          placeholder="Search collections…"
          value={inputValue}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(inputValue); setPage(1); } }}
          prefix={<Search size={14} />}
        />
        <Button variant="secondary" onClick={() => { setSearch(inputValue); setPage(1); }} className="shrink-0">
          Search
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (data?.data.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-text-muted">No collections found.</p>
          <Link href="/nfts/create">
            <Button variant="secondary" className="gap-2">
              <Plus size={14} />
              Be the first to create one
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((c) => (
              <CollectionCard key={c.address} collection={c} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </Button>
              <span className="text-sm text-text-muted px-4">Page {page} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}