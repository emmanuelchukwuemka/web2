"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCRO, shortAddress, timeAgo } from "@/lib/utils";

interface LiveEvent {
  id: string;
  type: "trade" | "token_created" | "graduated";
  tokenAddr?: string;
  trader?: string;
  isBuy?: boolean;
  croAmount?: string;
  name?: string;
  symbol?: string;
  timestamp: Date;
}

const rawBackend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const backendUrl = rawBackend.startsWith("http") ? rawBackend : `https://${rawBackend}`;
const WS_URL = backendUrl.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.type === "connected") return;

            const event: LiveEvent = {
              id:        `${Date.now()}-${Math.random()}`,
              type:      data.type,
              tokenAddr: data.data?.tokenAddr,
              trader:    data.data?.trader,
              isBuy:     data.data?.isBuy,
              croAmount: data.data?.croAmount,
              name:      data.data?.name,
              symbol:    data.data?.symbol,
              timestamp: new Date(),
            };
            setEvents((prev) => [event, ...prev].slice(0, 50));
          } catch { /* ignore */ }
        };

        ws.onclose = () => {
          setTimeout(connect, 3000);
        };
      } catch { /* WebSocket not available */ }
    }

    connect();
    return () => wsRef.current?.close();
  }, []);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
          <p className="text-sm text-text-muted">Waiting for live events…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 px-4 py-3 animate-fade-in hover:bg-bg-elevated transition-colors">
            {event.type === "trade" && (
              <>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${event.isBuy ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red"}`}>
                  {event.isBuy
                    ? <ArrowUpRight size={13} />
                    : <ArrowDownRight size={13} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary truncate">
                    {event.isBuy ? "Buy" : "Sell"}{" "}
                    <Link href={`/tokens/${event.tokenAddr}`} className="text-accent-purple-light hover:underline">
                      {shortAddress(event.tokenAddr ?? "")}
                    </Link>
                  </p>
                  <p className="text-xs text-text-muted">
                    {event.croAmount ? `${formatCRO(event.croAmount)} CRO` : ""} · {shortAddress(event.trader ?? "")}
                  </p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{timeAgo(event.timestamp)}</span>
              </>
            )}

            {event.type === "token_created" && (
              <>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple/10 text-accent-purple-light">
                  ✦
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary">
                    New token:{" "}
                    <Link href={`/tokens/${event.tokenAddr}`} className="text-accent-purple-light hover:underline font-medium">
                      ${event.symbol}
                    </Link>
                  </p>
                  <p className="text-xs text-text-muted">{event.name}</p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{timeAgo(event.timestamp)}</span>
              </>
            )}

            {event.type === "graduated" && (
              <>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber text-xs">
                  🎓
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-primary">
                    Graduated to DEX
                  </p>
                  <p className="text-xs text-text-muted">{shortAddress(event.tokenAddr ?? "")}</p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{timeAgo(event.timestamp)}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}