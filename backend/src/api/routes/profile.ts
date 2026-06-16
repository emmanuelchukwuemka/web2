import { FastifyInstance } from "fastify";
import { db } from "../../db";

export async function profileRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/profile/:address
  // Returns tokens created by and recent trades by this wallet address
  app.get("/:address", async (req, reply) => {
    const { address } = req.params as { address: string };
    const addr = address.toLowerCase();

    const [createdTokens, recentTrades, totalTrades] = await Promise.all([
      db.token.findMany({
        where: { creator: addr, hidden: false },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          address: true, name: true, symbol: true, image: true,
          graduated: true, realCroRaised: true, currentPrice: true, createdAt: true,
          _count: { select: { trades: true } },
        },
      }),
      db.trade.findMany({
        where: { trader: addr },
        orderBy: { timestamp: "desc" },
        take: 30,
        select: {
          id: true, tokenAddr: true, isBuy: true,
          tokenAmount: true, croAmount: true, price: true,
          txHash: true, timestamp: true,
          token: { select: { name: true, symbol: true, image: true } },
        },
      }),
      db.trade.count({ where: { trader: addr } }),
    ]);

    return reply.send({
      data: {
        address: addr,
        createdTokens,
        recentTrades,
        totalTrades,
      },
    });
  });
}