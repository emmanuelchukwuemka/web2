import { FastifyInstance } from "fastify";
import { db } from "../../db";
import { config } from "../../config";

export async function tokenRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /api/tokens ──────────────────────────────────────────────────────────
  app.get("/", async (req, reply) => {
    const {
      page = "1", limit = "20",
      sort = "createdAt", order = "desc",
      graduated, q, creator, featured,
    } = req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(100, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where: Record<string, unknown> = { hidden: false };
    if (graduated === "true")  where["graduated"] = true;
    if (graduated === "false") where["graduated"] = false;
    if (featured  === "true")  where["featured"]  = true;
    if (creator)               where["creator"]   = creator.toLowerCase();
    if (q) {
      where["OR"] = [
        { name:    { contains: q } },
        { symbol:  { contains: q } },
        { address: { contains: q.toLowerCase() } },
      ];
      delete where["hidden"]; // allow search to show hidden (non-moderation context)
      where["hidden"] = false;
    }

    const validSortFields = ["createdAt", "realCroRaised", "currentPrice", "featuredAt"] as const;
    const sortField = (validSortFields as readonly string[]).includes(sort) ? sort : "createdAt";
    const orderDir  = order === "asc" ? "asc" : "desc";

    const [tokens, total] = await Promise.all([
      db.token.findMany({
        where,
        orderBy: { [sortField]: orderDir },
        skip,
        take: limitN,
        select: {
          address: true, name: true, symbol: true, creator: true,
          bondingCurve: true, graduated: true, graduatedAt: true,
          realCroRaised: true, currentPrice: true, createdAt: true,
          image: true, description: true,
          featured: true, flagged: true,
          _count: { select: { trades: true } },
        },
      }),
      db.token.count({ where }),
    ]);

    return reply.send({ data: tokens, total, page: pageN, limit: limitN });
  });

  // ── GET /api/tokens/:address ─────────────────────────────────────────────────
  app.get("/:address", async (req, reply) => {
    const { address } = req.params as { address: string };

    const token = await db.token.findUnique({
      where: { address: address.toLowerCase() },
      include: { _count: { select: { trades: true, holders: true, comments: true } } },
    });

    if (!token) return reply.code(404).send({ error: "Token not found" });
    return reply.send({ data: token });
  });

  // ── PUT /api/tokens/:address/metadata ────────────────────────────────────────
  // Allows the creator (or anyone for v1) to set off-chain metadata
  app.put("/:address/metadata", async (req, reply) => {
    const { address } = req.params as { address: string };
    const body = req.body as {
      image?: string; description?: string;
      website?: string; twitter?: string; telegram?: string; discord?: string;
    };

    const existing = await db.token.findUnique({ where: { address: address.toLowerCase() } });
    if (!existing) return reply.code(404).send({ error: "Token not found" });

    const updated = await db.token.update({
      where: { address: address.toLowerCase() },
      data: {
        ...(body.image       !== undefined && { image:       body.image }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.website     !== undefined && { website:     body.website }),
        ...(body.twitter     !== undefined && { twitter:     body.twitter }),
        ...(body.telegram    !== undefined && { telegram:    body.telegram }),
        ...(body.discord     !== undefined && { discord:     body.discord }),
      },
      select: { address: true, image: true, description: true, website: true, twitter: true, telegram: true, discord: true },
    });

    return reply.send({ data: updated });
  });

  // ── GET /api/tokens/:address/trades ─────────────────────────────────────────
  app.get("/:address/trades", async (req, reply) => {
    const { address } = req.params as { address: string };
    const { page = "1", limit = "50", isBuy } =
      req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(200, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where: Record<string, unknown> = { tokenAddr: address.toLowerCase() };
    if (isBuy === "true")  where["isBuy"] = true;
    if (isBuy === "false") where["isBuy"] = false;

    const [trades, total] = await Promise.all([
      db.trade.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limitN,
      }),
      db.trade.count({ where }),
    ]);

    return reply.send({ data: trades, total, page: pageN, limit: limitN });
  });

  // ── GET /api/tokens/:address/chart ──────────────────────────────────────────
  app.get("/:address/chart", async (req, reply) => {
    const { address } = req.params as { address: string };
    const { interval = "5m", limit = "200" } =
      req.query as Record<string, string | undefined>;

    const intervalMs: Record<string, number> = {
      "1m":  60_000,
      "5m":  300_000,
      "1h":  3_600_000,
      "1d":  86_400_000,
    };
    const candle = intervalMs[interval] ?? intervalMs["5m"];
    const limitN = Math.min(500, Math.max(1, Number(limit)));

    const trades = await db.trade.findMany({
      where: { tokenAddr: address.toLowerCase() },
      orderBy: { timestamp: "asc" },
      select: { timestamp: true, price: true, croAmount: true },
    });

    const candles: Array<{
      time: number; open: string; high: string; low: string; close: string; volume: string;
    }> = [];

    let bucket: { time: number; open: string; high: string; low: string; close: string; volume: bigint } | null = null;

    for (const trade of trades) {
      const t = Math.floor(trade.timestamp.getTime() / candle) * candle;
      const p = BigInt(trade.price);
      const v = BigInt(trade.croAmount);

      if (!bucket || bucket.time !== t) {
        if (bucket) candles.push({ ...bucket, volume: bucket.volume.toString() });
        bucket = { time: t, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: v };
      } else {
        if (p > BigInt(bucket.high)) bucket.high = trade.price;
        if (p < BigInt(bucket.low))  bucket.low  = trade.price;
        bucket.close  = trade.price;
        bucket.volume += v;
      }
    }

    if (bucket) candles.push({ ...bucket, volume: bucket.volume.toString() });

    return reply.send({ data: candles.slice(-limitN) });
  });

  // ── GET /api/tokens/:address/holders ────────────────────────────────────────
  app.get("/:address/holders", async (req, reply) => {
    const { address } = req.params as { address: string };
    const { page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(200, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where = { tokenAddr: address.toLowerCase(), balance: { not: "0" } };

    const [holders, total] = await Promise.all([
      db.tokenHolder.findMany({
        where,
        orderBy: { balance: "desc" },
        skip,
        take: limitN,
        select: { holder: true, balance: true, updatedAt: true },
      }),
      db.tokenHolder.count({ where }),
    ]);

    return reply.send({ data: holders, total, page: pageN, limit: limitN });
  });

  // ── GET /api/tokens/:address/comments ───────────────────────────────────────
  app.get("/:address/comments", async (req, reply) => {
    const { address } = req.params as { address: string };
    const { page = "1", limit = "50" } = req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(100, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where = { tokenAddr: address.toLowerCase(), parentId: null };

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitN,
        include: {
          replies: {
            orderBy: { createdAt: "asc" },
            select: { id: true, author: true, content: true, createdAt: true },
          },
        },
      }),
      db.comment.count({ where }),
    ]);

    return reply.send({ data: comments, total, page: pageN, limit: limitN });
  });

  // ── POST /api/tokens/:address/comments ──────────────────────────────────────
  app.post("/:address/comments", async (req, reply) => {
    const { address } = req.params as { address: string };
    const body = req.body as { author?: string; content?: string; parentId?: number };

    if (!body.author || !body.content?.trim()) {
      return reply.code(400).send({ error: "author and content are required" });
    }
    if (body.content.length > 500) {
      return reply.code(400).send({ error: "content must be ≤ 500 characters" });
    }

    const token = await db.token.findUnique({ where: { address: address.toLowerCase() } });
    if (!token) return reply.code(404).send({ error: "Token not found" });

    // Validate parent exists if provided
    if (body.parentId) {
      const parent = await db.comment.findUnique({ where: { id: body.parentId } });
      if (!parent || parent.tokenAddr !== address.toLowerCase()) {
        return reply.code(400).send({ error: "Invalid parentId" });
      }
    }

    // Check blocklist
    const blocked = await db.blockedWallet.findUnique({ where: { address: body.author.toLowerCase() } });
    if (blocked) return reply.code(403).send({ error: "Wallet is blocked" });

    const comment = await db.comment.create({
      data: {
        tokenAddr: address.toLowerCase(),
        author:    body.author.toLowerCase(),
        content:   body.content.trim(),
        parentId:  body.parentId ?? null,
      },
    });

    return reply.code(201).send({ data: comment });
  });
}

// ── Admin auth helper ─────────────────────────────────────────────────────────

export function requireAdmin(req: { headers: Record<string, string | string[] | undefined> }, reply: { code: (c: number) => { send: (b: unknown) => unknown } }): boolean {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth || auth !== `Bearer ${config.adminSecret}`) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}