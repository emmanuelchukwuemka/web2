import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { tokenRoutes }   from "./routes/tokens";
import { nftRoutes }     from "./routes/nfts";
import { stakingRoutes } from "./routes/staking";
import { uploadRoutes }  from "./routes/upload";
import { adminRoutes }   from "./routes/admin";
import { profileRoutes } from "./routes/profile";
import { broadcaster, WsEvent } from "../broadcaster";
import { config } from "../config";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  // ── REST routes ──────────────────────────────────────────────────────────────
  await app.register(tokenRoutes,   { prefix: "/api/tokens"   });
  await app.register(nftRoutes,     { prefix: "/api/nfts"     });
  await app.register(stakingRoutes, { prefix: "/api/staking"  });
  await app.register(uploadRoutes,  { prefix: "/api/upload"   });
  await app.register(adminRoutes,   { prefix: "/api/admin"    });
  await app.register(profileRoutes, { prefix: "/api/profile"  });

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  // ── WebSocket — real-time event feed ─────────────────────────────────────────
  app.get("/ws", { websocket: true }, (socket) => {
    const handler = (event: WsEvent) => {
      if (socket.readyState === 1) socket.send(JSON.stringify(event));
    };
    broadcaster.on("event", handler);
    socket.on("close", () => broadcaster.off("event", handler));
    socket.send(JSON.stringify({ type: "connected", ts: new Date().toISOString() }));
  });

  return app;
}

export async function startServer(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: config.port, host: config.host });
  console.log(`[api] Listening on http://${config.host}:${config.port}`);
}