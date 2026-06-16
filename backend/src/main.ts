import { startServer }  from "./api/server";
import { startIndexer } from "./indexer/index";
import { config }       from "./config";

async function main(): Promise<void> {
  console.log("N.W.O Launchpad — backend starting…");
  console.log(`  RPC            : ${config.rpcUrl}`);
  console.log(`  chainId        : ${config.chainId}`);
  console.log(`  TokenFactory   : ${config.tokenFactoryAddress || "(not set)"}`);
  console.log(`  NFTFactory     : ${config.nftFactoryAddress   || "(not set)"}`);
  console.log(`  Staking        : ${config.stakingAddress      || "(not set)"}`);
  console.log(`  Poll interval  : ${config.pollIntervalMs}ms`);
  console.log(`  API port       : ${config.port}`);

  // Start the API server first so health checks pass immediately
  await startServer();

  // Then start the indexer (runs its initial sync, then polls on an interval)
  await startIndexer();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});