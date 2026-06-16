import { EventEmitter } from "events";

// Central in-process event bus. The WebSocket handler subscribes to these
// events and fans them out to connected clients.
export const broadcaster = new EventEmitter();
broadcaster.setMaxListeners(100);

export type WsEvent =
  | { type: "token_created"; data: Record<string, unknown> }
  | { type: "trade";         data: Record<string, unknown> }
  | { type: "graduated";     data: Record<string, unknown> }
  | { type: "nft_created";   data: Record<string, unknown> }
  | { type: "staking";       data: Record<string, unknown> };

export function broadcast(event: WsEvent): void {
  broadcaster.emit("event", event);
}