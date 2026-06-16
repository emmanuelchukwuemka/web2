import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../../db";
import { config } from "../../config";

function checkAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${config.adminSecret}`) {
    reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {

  // ── Token moderation ─────────────────────────────────────────────────────────

  // GET /api/admin/tokens — list all tokens including hidden/flagged
  app.get("/tokens", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;

    const { page = "1", limit = "50", hidden, flagged, featured } =
      req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(200, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where: Record<string, unknown> = {};
    if (hidden   === "true")  where["hidden"]   = true;
    if (flagged  === "true")  where["flagged"]  = true;
    if (featured === "true")  where["featured"] = true;

    const [tokens, total] = await Promise.all([
      db.token.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitN,
        select: {
          address: true, name: true, symbol: true, creator: true, createdAt: true,
          hidden: true, flagged: true, flagReason: true, featured: true, featuredAt: true,
          graduated: true, realCroRaised: true,
          _count: { select: { trades: true } },
        },
      }),
      db.token.count({ where }),
    ]);

    return reply.send({ data: tokens, total, page: pageN, limit: limitN });
  });

  // POST /api/admin/tokens/:address/hide
  app.post("/tokens/:address/hide", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    await db.token.update({ where: { address: address.toLowerCase() }, data: { hidden: true } });
    return reply.send({ ok: true });
  });

  // POST /api/admin/tokens/:address/unhide
  app.post("/tokens/:address/unhide", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    await db.token.update({ where: { address: address.toLowerCase() }, data: { hidden: false } });
    return reply.send({ ok: true });
  });

  // POST /api/admin/tokens/:address/feature
  app.post("/tokens/:address/feature", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    await db.token.update({
      where: { address: address.toLowerCase() },
      data: { featured: true, featuredAt: new Date() },
    });
    return reply.send({ ok: true });
  });

  // POST /api/admin/tokens/:address/unfeature
  app.post("/tokens/:address/unfeature", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    await db.token.update({
      where: { address: address.toLowerCase() },
      data: { featured: false, featuredAt: null },
    });
    return reply.send({ ok: true });
  });

  // POST /api/admin/tokens/:address/flag
  app.post("/tokens/:address/flag", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    const body = req.body as { reason?: string };
    await db.token.update({
      where: { address: address.toLowerCase() },
      data: { flagged: true, flagReason: body.reason ?? "Flagged by admin" },
    });
    return reply.send({ ok: true });
  });

  // POST /api/admin/tokens/:address/unflag
  app.post("/tokens/:address/unflag", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    await db.token.update({
      where: { address: address.toLowerCase() },
      data: { flagged: false, flagReason: null },
    });
    return reply.send({ ok: true });
  });

  // ── Wallet blocklist ─────────────────────────────────────────────────────────

  // GET /api/admin/blocklist
  app.get("/blocklist", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const wallets = await db.blockedWallet.findMany({ orderBy: { blockedAt: "desc" } });
    return reply.send({ data: wallets });
  });

  // POST /api/admin/blocklist
  app.post("/blocklist", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const body = req.body as { address?: string; reason?: string; blockedBy?: string };
    if (!body.address) return reply.code(400).send({ error: "address is required" });

    const wallet = await db.blockedWallet.upsert({
      where:  { address: body.address.toLowerCase() },
      create: {
        address:   body.address.toLowerCase(),
        reason:    body.reason,
        blockedBy: body.blockedBy ?? "admin",
      },
      update: {
        reason:    body.reason,
        blockedBy: body.blockedBy ?? "admin",
        blockedAt: new Date(),
      },
    });
    return reply.code(201).send({ data: wallet });
  });

  // DELETE /api/admin/blocklist/:address
  app.delete("/blocklist/:address", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { address } = req.params as { address: string };
    try {
      await db.blockedWallet.delete({ where: { address: address.toLowerCase() } });
      return reply.send({ ok: true });
    } catch {
      return reply.code(404).send({ error: "Address not in blocklist" });
    }
  });

  // ── Comment moderation ───────────────────────────────────────────────────────

  // DELETE /api/admin/comments/:id
  app.delete("/comments/:id", async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    try {
      await db.comment.delete({ where: { id: Number(id) } });
      return reply.send({ ok: true });
    } catch {
      return reply.code(404).send({ error: "Comment not found" });
    }
  });
}