import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { db } from "../../db";
import { config } from "../../config";
import { STAKING_ABI } from "../../abis";

export async function stakingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/staking — global stats
  app.get("/", async (_req, reply) => {
    const [feeAmounts, eventCounts] = await Promise.all([
      db.stakingEvent.findMany({
        where:  { eventType: "fees" },
        select: { amount: true },
      }),
      db.stakingEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
      }),
    ]);

    const totalFees = feeAmounts
      .reduce((acc: bigint, e: { amount: string }) => acc + BigInt(e.amount), 0n)
      .toString();

    // Optionally fetch live on-chain state if staking address is configured
    let liveStats: { totalStaked: string; accCroPerShare: string } | null = null;
    if (config.stakingAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
        const staking = new ethers.Contract(
          config.stakingAddress,
          STAKING_ABI as unknown as string[],
          provider
        );
        const [totalStaked, accCroPerShare] = await Promise.all([
          staking["totalStaked"]() as Promise<bigint>,
          staking["accCroPerShare"]() as Promise<bigint>,
        ]);
        liveStats = {
          totalStaked:    totalStaked.toString(),
          accCroPerShare: accCroPerShare.toString(),
        };
      } catch {
        // Node unavailable — return only indexed data
      }
    }

    const counts: Record<string, number> = {};
    for (const row of eventCounts) counts[row.eventType] = row._count._all;

    return reply.send({
      data: {
        totalFeesDistributed: totalFees,
        liveStats,
        eventCounts: counts,
      },
    });
  });

  // GET /api/staking/events — recent staking events (paginated)
  app.get("/events", async (req, reply) => {
    const { page = "1", limit = "50", type, user } =
      req.query as Record<string, string | undefined>;

    const pageN  = Math.max(1, Number(page));
    const limitN = Math.min(200, Math.max(1, Number(limit)));
    const skip   = (pageN - 1) * limitN;

    const where: Record<string, unknown> = {};
    if (type) where["eventType"] = type;
    if (user) where["user"]      = user.toLowerCase();

    const [events, total] = await Promise.all([
      db.stakingEvent.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limitN,
      }),
      db.stakingEvent.count({ where }),
    ]);

    return reply.send({ data: events, total, page: pageN, limit: limitN });
  });

  // GET /api/staking/user/:address — live pending rewards for a wallet
  app.get("/user/:address", async (req, reply) => {
    const { address } = req.params as { address: string };

    if (!config.stakingAddress) {
      return reply.code(503).send({ error: "Staking contract not configured" });
    }

    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
      const staking = new ethers.Contract(
        config.stakingAddress,
        STAKING_ABI as unknown as string[],
        provider
      );
      const pending: bigint = await staking["pendingRewards"](address);

      // Pull indexed history for this user
      const history = await db.stakingEvent.findMany({
        where:   { user: address.toLowerCase() },
        orderBy: { timestamp: "desc" },
        take:    100,
      });

      return reply.send({
        data: { pendingRewards: pending.toString(), history },
      });
    } catch (err) {
      return reply.code(500).send({ error: "Failed to fetch on-chain data" });
    }
  });
}