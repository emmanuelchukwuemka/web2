import { FastifyInstance } from "fastify";
import { db } from "../../db";

export async function nftRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/nfts
  app.get("/", async (req, reply) => {
    const { page = "1", limit = "20", q } =
      req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(100, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where: Record<string, unknown> = {};
    if (q) {
      where["OR"] = [
        { name:    { contains: q } },
        { symbol:  { contains: q } },
        { address: { contains: q.toLowerCase() } },
      ];
    }

    const [collections, total] = await Promise.all([
      db.nFTCollection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitN,
      }),
      db.nFTCollection.count({ where }),
    ]);

    return reply.send({ data: collections, total, page: pageN, limit: limitN });
  });

  // GET /api/nfts/:address
  app.get("/:address", async (req, reply) => {
    const { address } = req.params as { address: string };

    const collection = await db.nFTCollection.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!collection) return reply.code(404).send({ error: "Collection not found" });
    return reply.send({ data: collection });
  });
}