import { ethers } from "ethers";
import { db } from "../db";
import { config } from "../config";
import {
  TOKEN_FACTORY_ABI,
  BONDING_CURVE_ABI,
  NFT_FACTORY_ABI,
  STAKING_ABI,
  ERC20_ABI,
} from "../abis";
import { broadcast } from "../broadcaster";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCursor(key: string): Promise<number> {
  const row = await db.indexerState.findUnique({ where: { key } });
  return row ? Number(row.value) : config.startBlock;
}

async function setCursor(key: string, block: number): Promise<void> {
  await db.indexerState.upsert({
    where:  { key },
    create: { key, value: String(block) },
    update: { value: String(block) },
  });
}

function iface(abi: readonly string[]): ethers.Interface {
  return new ethers.Interface(abi as string[]);
}

// ─── Per-contract indexing ────────────────────────────────────────────────────

async function indexTokenFactory(
  provider: ethers.JsonRpcProvider,
  from: number,
  to: number
): Promise<void> {
  if (!config.tokenFactoryAddress) return;

  const contract = new ethers.Contract(
    config.tokenFactoryAddress,
    TOKEN_FACTORY_ABI as unknown as string[],
    provider
  );

  const filter = contract.filters["TokenCreated"]();
  const logs = await contract.queryFilter(filter, from, to);

  for (const log of logs) {
    const e = log as ethers.EventLog;
    const [token, curve, creator, name, symbol, ts] = e.args as unknown as [
      string, string, string, string, string, bigint
    ];

    const block = await provider.getBlock(e.blockNumber);
    const timestamp = new Date((block?.timestamp ?? Number(ts)) * 1000);

    await db.token.upsert({
      where:  { address: token.toLowerCase() },
      create: {
        address:      token.toLowerCase(),
        name,
        symbol,
        creator:      creator.toLowerCase(),
        bondingCurve: curve.toLowerCase(),
        blockNumber:  e.blockNumber,
        txHash:       e.transactionHash,
        createdAt:    timestamp,
      },
      update: {},
    });

    broadcast({
      type: "token_created",
      data: { address: token, curve, creator, name, symbol, createdAt: timestamp },
    });

    console.log(`[indexer] TokenCreated  ${symbol} (${token})`);
  }
}

async function indexBondingCurves(
  provider: ethers.JsonRpcProvider,
  from: number,
  to: number
): Promise<void> {
  // Query all Buy / Sell / Graduated events from any address using raw topic hashes.
  const abi = iface(BONDING_CURVE_ABI as unknown as string[]);
  const buyTopic  = abi.getEvent("Buy")!.topicHash;
  const sellTopic = abi.getEvent("Sell")!.topicHash;
  const gradTopic = abi.getEvent("Graduated")!.topicHash;

  const logs = await provider.getLogs({
    fromBlock: from,
    toBlock:   to,
    topics:    [[buyTopic, sellTopic, gradTopic]],
  });

  for (const log of logs) {
    const curveAddr = log.address.toLowerCase();

    // Only process logs from curves we know about
    const token = await db.token.findFirst({
      where: { bondingCurve: curveAddr },
    });
    if (!token) continue;

    const block = await provider.getBlock(log.blockNumber);
    const timestamp = new Date((block?.timestamp ?? 0) * 1000);

    if (log.topics[0] === buyTopic || log.topics[0] === sellTopic) {
      const isBuy = log.topics[0] === buyTopic;
      const decoded = abi.decodeEventLog(
        isBuy ? "Buy" : "Sell",
        log.data,
        log.topics
      );

      let trader: string;
      let tokenAmount: bigint;
      let croAmount: bigint;
      let fee: bigint;

      if (isBuy) {
        [trader, croAmount, tokenAmount, fee] = decoded as unknown as [string, bigint, bigint, bigint];
      } else {
        [trader, tokenAmount, croAmount, fee] = decoded as unknown as [string, bigint, bigint, bigint];
      }

      // Fetch live reserves to compute price at this point
      let price = "0";
      try {
        const curve = new ethers.Contract(
          curveAddr,
          BONDING_CURVE_ABI as unknown as string[],
          provider
        );
        const [cro, tok] = await Promise.all([
          curve["croReserves"]() as Promise<bigint>,
          curve["tokenReserves"]() as Promise<bigint>,
        ]);
        if (tok > 0n) price = ((cro * BigInt(1e18)) / tok).toString();

        // Refresh reserves in token row
        const realCroRaised: bigint = await curve["realCroRaised"]();
        await db.token.update({
          where: { address: token.address },
          data: {
            croReserves:   cro.toString(),
            tokenReserves: tok.toString(),
            realCroRaised: realCroRaised.toString(),
            currentPrice:  price,
          },
        });
      } catch {
        // Curve may have graduated; skip reserve refresh
      }

      await db.trade.create({
        data: {
          tokenAddr:   token.address,
          curveAddr,
          trader:      trader.toLowerCase(),
          isBuy,
          tokenAmount: tokenAmount.toString(),
          croAmount:   croAmount.toString(),
          fee:         fee.toString(),
          price,
          txHash:      log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp,
        },
      });

      broadcast({
        type: "trade",
        data: {
          tokenAddr: token.address,
          curveAddr,
          trader,
          isBuy,
          tokenAmount: tokenAmount.toString(),
          croAmount:   croAmount.toString(),
          price,
          timestamp,
        },
      });

      console.log(
        `[indexer] ${isBuy ? "Buy " : "Sell"} ${token.symbol}  trader=${trader.slice(0, 8)}…`
      );
    } else if (log.topics[0] === gradTopic) {
      const decoded = abi.decodeEventLog("Graduated", log.data, log.topics);
      const [, croForLp, , pair] = decoded as unknown as [string, bigint, bigint, string];

      await db.token.update({
        where: { address: token.address },
        data:  { graduated: true, graduatedAt: timestamp, tokenReserves: "0", croReserves: "0" },
      });

      broadcast({
        type: "graduated",
        data: { tokenAddr: token.address, croForLp: croForLp.toString(), pair, timestamp },
      });

      console.log(`[indexer] Graduated   ${token.symbol}  pair=${pair}`);
    }
  }
}

async function indexNFTFactory(
  provider: ethers.JsonRpcProvider,
  from: number,
  to: number
): Promise<void> {
  if (!config.nftFactoryAddress) return;

  const contract = new ethers.Contract(
    config.nftFactoryAddress,
    NFT_FACTORY_ABI as unknown as string[],
    provider
  );

  const filter = contract.filters["CollectionCreated"]();
  const logs = await contract.queryFilter(filter, from, to);

  for (const log of logs) {
    const e = log as ethers.EventLog;
    const [collection, creator, name, symbol, maxSupply, ts] = e.args as unknown as [
      string, string, string, string, bigint, bigint
    ];

    const block = await provider.getBlock(e.blockNumber);
    const timestamp = new Date((block?.timestamp ?? Number(ts)) * 1000);

    await db.nFTCollection.upsert({
      where:  { address: collection.toLowerCase() },
      create: {
        address:    collection.toLowerCase(),
        name,
        symbol,
        creator:    creator.toLowerCase(),
        maxSupply:  Number(maxSupply),
        blockNumber: e.blockNumber,
        txHash:     e.transactionHash,
        createdAt:  timestamp,
      },
      update: {},
    });

    broadcast({
      type: "nft_created",
      data: { address: collection, creator, name, symbol, maxSupply: maxSupply.toString(), createdAt: timestamp },
    });

    console.log(`[indexer] CollectionCreated  ${name} (${collection})`);
  }
}

async function indexStaking(
  provider: ethers.JsonRpcProvider,
  from: number,
  to: number
): Promise<void> {
  if (!config.stakingAddress) return;

  const contract = new ethers.Contract(
    config.stakingAddress,
    STAKING_ABI as unknown as string[],
    provider
  );

  type EventName = "Staked" | "Unstaked" | "Claimed" | "FeesDeposited";
  const events: Array<{ name: EventName; type: string }> = [
    { name: "Staked",        type: "stake"   },
    { name: "Unstaked",      type: "unstake" },
    { name: "Claimed",       type: "claim"   },
    { name: "FeesDeposited", type: "fees"    },
  ];

  for (const { name, type } of events) {
    const filter = contract.filters[name]();
    const logs = await contract.queryFilter(filter, from, to);

    for (const log of logs) {
      const e = log as ethers.EventLog;
      const block = await provider.getBlock(e.blockNumber);
      const timestamp = new Date((block?.timestamp ?? 0) * 1000);

      let user: string | null = null;
      let from_: string | null = null;
      let amount: bigint;

      if (name === "FeesDeposited") {
        [from_, amount] = e.args as unknown as [string, bigint];
        from_ = from_.toLowerCase();
      } else {
        [user, amount] = e.args as unknown as [string, bigint];
        user = user.toLowerCase();
      }

      await db.stakingEvent.create({
        data: {
          user,
          from:       from_,
          eventType:  type,
          amount:     amount.toString(),
          txHash:     e.transactionHash,
          blockNumber: e.blockNumber,
          timestamp,
        },
      });

      broadcast({
        type: "staking",
        data: { eventType: type, user, from: from_, amount: amount.toString(), timestamp },
      });
    }
  }
}

// ─── Token holder tracking (Transfer events) ─────────────────────────────────

async function indexTokenTransfers(
  provider: ethers.JsonRpcProvider,
  from: number,
  to: number
): Promise<void> {
  // Get all known token addresses from DB
  const tokens = await db.token.findMany({ select: { address: true } });
  if (tokens.length === 0) return;

  const transferTopic = iface(ERC20_ABI as unknown as string[])
    .getEvent("Transfer")!.topicHash;

  const logs = await provider.getLogs({
    fromBlock: from,
    toBlock:   to,
    topics:    [transferTopic],
  });

  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const tokenSet  = new Set(tokens.map((t) => t.address));
  const erc20     = iface(ERC20_ABI as unknown as string[]);

  for (const log of logs) {
    const tokenAddr = log.address.toLowerCase();
    if (!tokenSet.has(tokenAddr)) continue;

    const decoded = erc20.decodeEventLog("Transfer", log.data, log.topics);
    const [fromAddr, toAddr, value] = decoded as unknown as [string, string, bigint];

    const sender   = fromAddr.toLowerCase();
    const receiver = toAddr.toLowerCase();

    // Decrement sender balance (skip mints from zero address)
    if (sender !== ZERO_ADDR) {
      const existing = await db.tokenHolder.findUnique({
        where: { tokenAddr_holder: { tokenAddr, holder: sender } },
      });
      const prev = BigInt(existing?.balance ?? "0");
      const next = prev >= value ? prev - value : 0n;
      await db.tokenHolder.upsert({
        where:  { tokenAddr_holder: { tokenAddr, holder: sender } },
        create: { tokenAddr, holder: sender, balance: next.toString() },
        update: { balance: next.toString() },
      });
    }

    // Increment receiver balance (skip burns to zero address)
    if (receiver !== ZERO_ADDR) {
      const existing = await db.tokenHolder.findUnique({
        where: { tokenAddr_holder: { tokenAddr, holder: receiver } },
      });
      const prev = BigInt(existing?.balance ?? "0");
      const next = prev + value;
      await db.tokenHolder.upsert({
        where:  { tokenAddr_holder: { tokenAddr, holder: receiver } },
        create: { tokenAddr, holder: receiver, balance: next.toString() },
        update: { balance: next.toString() },
      });
    }
  }
}

// ─── Main polling loop ────────────────────────────────────────────────────────

export async function startIndexer(): Promise<void> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);

  console.log(`[indexer] Starting — RPC: ${config.rpcUrl}  chainId: ${config.chainId}`);

  const CURSOR_KEY = "lastBlock";

  async function poll(): Promise<void> {
    try {
      const latest = await provider.getBlockNumber();
      const from   = await getCursor(CURSOR_KEY);

      if (from > latest) return;

      // Process in chunks to stay within node getLogs limits
      const chunk = config.blockChunkSize;
      for (let start = from; start <= latest; start += chunk) {
        const end = Math.min(start + chunk - 1, latest);

        await Promise.all([
          indexTokenFactory(provider, start, end),
          indexNFTFactory(provider, start, end),
          indexStaking(provider, start, end),
        ]);

        // BondingCurve events are processed separately (multi-address query)
        await indexBondingCurves(provider, start, end);

        // Track ERC20 Transfer events for holder balance table
        await indexTokenTransfers(provider, start, end);

        await setCursor(CURSOR_KEY, end + 1);
      }
    } catch (err) {
      console.error("[indexer] Poll error:", err);
    }
  }

  // Initial catch-up then regular polling
  await poll();
  setInterval(poll, config.pollIntervalMs);
}