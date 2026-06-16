import * as dotenv from "dotenv";
dotenv.config();

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  // Chain
  rpcUrl:   optional("RPC_URL", "https://evm-t3.cronos.org"),
  chainId:  Number(optional("CHAIN_ID", "338")),
  startBlock: Number(optional("START_BLOCK", "0")),

  // Contract addresses
  controllerAddress:   optional("CONTROLLER_ADDRESS", ""),
  tokenFactoryAddress: optional("TOKEN_FACTORY_ADDRESS", ""),
  nftFactoryAddress:   optional("NFT_FACTORY_ADDRESS", ""),
  stakingAddress:      optional("STAKING_ADDRESS", ""),
  wolfAddress:         optional("WOLF_ADDRESS", ""),

  // Server
  port: Number(optional("PORT", "3001")),
  host: optional("HOST", "0.0.0.0"),

  // Indexer tuning
  pollIntervalMs: Number(optional("POLL_INTERVAL_MS", "5000")),
  blockChunkSize: Number(optional("BLOCK_CHUNK_SIZE", "2000")),

  // Pinata IPFS
  pinataJwt: optional("PINATA_JWT", ""),

  // Admin secret — required as Authorization: Bearer <secret> on /api/admin/* routes
  adminSecret: optional("ADMIN_SECRET", "change-me-in-production"),
} as const;