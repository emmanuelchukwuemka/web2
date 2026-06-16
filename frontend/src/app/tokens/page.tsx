"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TokenGrid } from "@/components/tokens/TokenGrid";
import { PageSpinner } from "@/components/ui/spinner";
import { fetchTokens } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab    = "all" | "trading" | "graduated";
type SortBy = "createdAt" | "realCroRaised" | "currentPrice";

const TABS: { key: Tab; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "trading",   label: "Trading"   },
  { key: "graduated", label: "Graduated" },
];

const SORTS: { key: SortBy; label: string }[] = [
  { key: "createdAt",    label: "Newest"    },
  { key: "realCroRaised", label: "Volume"   },
  { key: "currentPrice",  label: "Price"   },
];

export default function TokensPage() {
  const [tab,    setTab]    = useState<Tab>("all");
  const [sort,   setSort]   = useState<SortBy>("createdAt");
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");

  const graduatedFilter =
    tab === "trading"   ? false :
    tab === "graduated" ? true  :
    undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["tokens", tab, sort, page, search],
    queryFn:  () =>
      fetchTokens({
        page,
        limit: 18,
        sort,
        order: "desc",
        graduated: graduatedFilter,
        q: search || undefined,
      }),
  });

  function handleSearch() {
    setSearch(inputValue);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / 18) : 1;

  return (
    <div className="page-container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-1">Explore Tokens</h1>
        <p className="text-text-secondary">
          {data ? `${data.total.toLocaleString()} tokens launched on N.W.O` : "Browse all launched tokens"}
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Tabs */}
        <div className="flex rounded-lg border border-border bg-bg-card p-1 gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPage(1); }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                tab === key
                  ? "bg-accent-purple text-white shadow-glow-sm"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex rounded-lg border border-border bg-bg-card p-1 gap-1">
          <SlidersHorizontal size={14} className="my-auto ml-2 text-text-muted" />
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSort(key); setPage(1); }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-all",
                sort === key
                  ? "bg-bg-elevated text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search by name, symbol, or address…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            prefix={<Search size={14} />}
          />
          <Button variant="secondary" onClick={handleSearch} size="md" className="shrink-0">
            Search
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <PageSpinner />
      ) : (
        <>
          <TokenGrid
            tokens={data?.data ?? []}
            emptyMessage="No tokens match your filters."
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </Button>
              <span className="text-sm text-text-muted px-4">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}