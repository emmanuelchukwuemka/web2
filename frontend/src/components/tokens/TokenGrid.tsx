import { type Token } from "@/lib/api";
import { TokenCard } from "./TokenCard";

interface TokenGridProps {
  tokens: Token[];
  emptyMessage?: string;
}

export function TokenGrid({ tokens, emptyMessage = "No tokens found." }: TokenGridProps) {
  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-text-muted text-sm">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <TokenCard key={token.address} token={token} />
      ))}
    </div>
  );
}