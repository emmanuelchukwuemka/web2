import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const isTestnet = network.name === "cronosTestnet";

  console.log(`\nDeploying on network: ${network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} CRO\n`);

  // ── Config ──────────────────────────────────────────────────────────────────
  const TREASURY         = process.env.TREASURY_ADDRESS    ?? deployer.address;
  const WOLF_HOLDER      = process.env.WOLF_HOLDER_ADDRESS ?? deployer.address;
  const FEE_BPS          = 100n;
  const CREATION_FEE     = ethers.parseEther("10");
  const NFT_CREATION_FEE = ethers.parseEther("5");
  const GRADUATION_THRESHOLD = ethers.parseEther("500");
  const ANTI_BOT_BLOCKS  = 5n;
  const ANTI_BOT_MAX_BPS = 500n;
  const BUY_COOLDOWN     = 30n;

  // ── VVS Router ──────────────────────────────────────────────────────────────
  let vvsRouter: string;

  if (isTestnet) {
    console.log("0/6  Deploying MockVVSRouter (testnet only)...");
    const Mock = await ethers.getContractFactory("MockVVSRouter");
    const mock = await Mock.deploy();
    await mock.waitForDeployment();
    vvsRouter = await mock.getAddress();
    console.log(`     MockVVSRouter       : ${vvsRouter}`);
  } else {
    if (!process.env.VVS_ROUTER_ADDRESS) {
      throw new Error("VVS_ROUTER_ADDRESS not set. Get it from https://docs.vvs.finance/");
    }
    vvsRouter = process.env.VVS_ROUTER_ADDRESS;
    console.log(`     VVS Router          : ${vvsRouter}`);
  }

  // ── 1. LaunchpadController ──────────────────────────────────────────────────
  console.log("1/6  Deploying LaunchpadController...");
  const Controller = await ethers.getContractFactory("LaunchpadController");
  const controller = await Controller.deploy(
    TREASURY, FEE_BPS, CREATION_FEE, NFT_CREATION_FEE,
    GRADUATION_THRESHOLD, ANTI_BOT_BLOCKS, ANTI_BOT_MAX_BPS, BUY_COOLDOWN,
  );
  await controller.waitForDeployment();
  const controllerAddr = await controller.getAddress();
  console.log(`     LaunchpadController : ${controllerAddr}`);

  // ── 2. BondingCurve implementation ─────────────────────────────────────────
  console.log("2/6  Deploying BondingCurve implementation...");
  const CurveImpl = await ethers.getContractFactory("BondingCurve");
  const curveImpl = await CurveImpl.deploy();
  await curveImpl.waitForDeployment();
  const curveImplAddr = await curveImpl.getAddress();
  console.log(`     BondingCurve (impl) : ${curveImplAddr}`);

  // ── 3. TokenFactory ─────────────────────────────────────────────────────────
  console.log("3/6  Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy(controllerAddr, vvsRouter, curveImplAddr);
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddr = await tokenFactory.getAddress();
  console.log(`     TokenFactory        : ${tokenFactoryAddr}`);

  // ── 4. NFTFactory ───────────────────────────────────────────────────────────
  console.log("4/6  Deploying NFTFactory...");
  const NFTFactory = await ethers.getContractFactory("NFTFactory");
  const nftFactory = await NFTFactory.deploy(controllerAddr);
  await nftFactory.waitForDeployment();
  const nftFactoryAddr = await nftFactory.getAddress();
  console.log(`     NFTFactory          : ${nftFactoryAddr}`);

  // ── 5. WOLF token ───────────────────────────────────────────────────────────
  console.log("5/6  Deploying WOLF token...");
  const WolfFactory = await ethers.getContractFactory("WOLF");
  const wolf = await WolfFactory.deploy(WOLF_HOLDER);
  await wolf.waitForDeployment();
  const wolfAddr = await wolf.getAddress();
  console.log(`     WOLF token          : ${wolfAddr}`);

  // ── 6. Staking ──────────────────────────────────────────────────────────────
  console.log("6/6  Deploying Staking...");
  const StakingFactory = await ethers.getContractFactory("Staking");
  const staking = await StakingFactory.deploy(wolfAddr);
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log(`     Staking             : ${stakingAddr}`);

  // ── Wire treasury → staking automatically ───────────────────────────────────
  console.log("\nWiring controller treasury → Staking...");
  await (controller as any).setTreasury(stakingAddr);
  console.log("     Done.\n");

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("✅  All contracts deployed!\n");
  console.log("── Copy into backend/.env ──────────────────────────────────────────");
  console.log(`CONTROLLER_ADDRESS=${controllerAddr}`);
  console.log(`TOKEN_FACTORY_ADDRESS=${tokenFactoryAddr}`);
  console.log(`NFT_FACTORY_ADDRESS=${nftFactoryAddr}`);
  console.log(`STAKING_ADDRESS=${stakingAddr}`);
  console.log(`WOLF_ADDRESS=${wolfAddr}`);
  console.log("\n── Copy into frontend/.env.local ───────────────────────────────────");
  console.log(`NEXT_PUBLIC_CONTROLLER_ADDRESS=${controllerAddr}`);
  console.log(`NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=${tokenFactoryAddr}`);
  console.log(`NEXT_PUBLIC_NFT_FACTORY_ADDRESS=${nftFactoryAddr}`);
  console.log(`NEXT_PUBLIC_STAKING_ADDRESS=${stakingAddr}`);
  console.log(`NEXT_PUBLIC_WOLF_ADDRESS=${wolfAddr}`);

  if (!isTestnet) {
    console.log(`
── Verify on Cronoscan ─────────────────────────────────────────────
npx hardhat verify --network cronos ${controllerAddr} "${TREASURY}" ${FEE_BPS} ${CREATION_FEE} ${NFT_CREATION_FEE} ${GRADUATION_THRESHOLD} ${ANTI_BOT_BLOCKS} ${ANTI_BOT_MAX_BPS} ${BUY_COOLDOWN}
npx hardhat verify --network cronos ${curveImplAddr}
npx hardhat verify --network cronos ${tokenFactoryAddr} "${controllerAddr}" "${vvsRouter}" "${curveImplAddr}"
npx hardhat verify --network cronos ${nftFactoryAddr} "${controllerAddr}"
npx hardhat verify --network cronos ${wolfAddr} "${WOLF_HOLDER}"
npx hardhat verify --network cronos ${stakingAddr} "${wolfAddr}"
`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});