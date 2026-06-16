import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  LaunchpadController,
  TokenFactory,
  BondingCurve,
  LaunchToken,
} from "../typechain-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ZERO_ADDRESS = ethers.ZeroAddress;

const BPS_DENOM = 10_000n;
const FEE_BPS = 100n;         // 1%
const CREATION_FEE = ethers.parseEther("10");
const NFT_CREATION_FEE = ethers.parseEther("5");
const GRADUATION_THRESHOLD = ethers.parseEther("500");
const ANTI_BOT_BLOCKS = 5n;
const ANTI_BOT_MAX_BPS = 500n; // 5% of supply
const BUY_COOLDOWN = 0n;       // disabled for most tests

async function deployAll(
  treasury: HardhatEthersSigner,
  customThreshold?: bigint
) {
  const [deployer] = await ethers.getSigners();

  // ── Controller ──
  const Controller = await ethers.getContractFactory("LaunchpadController");
  const controller = (await Controller.deploy(
    treasury.address,
    FEE_BPS,
    CREATION_FEE,
    NFT_CREATION_FEE,
    customThreshold ?? GRADUATION_THRESHOLD,
    ANTI_BOT_BLOCKS,
    ANTI_BOT_MAX_BPS,
    BUY_COOLDOWN
  )) as unknown as LaunchpadController;

  // ── Curve implementation (cloned by factory) ──
  const CurveImpl = await ethers.getContractFactory("BondingCurve");
  const curveImpl = await CurveImpl.deploy();

  // ── Mock VVS Router (accepts addLiquidityETH without reverting) ──
  const MockRouter = await ethers.getContractFactory("MockVVSRouter");
  const mockRouter = await MockRouter.deploy();

  // ── Factory ──
  const Factory = await ethers.getContractFactory("TokenFactory");
  const factory = (await Factory.deploy(
    await controller.getAddress(),
    await mockRouter.getAddress(),
    await curveImpl.getAddress()
  )) as unknown as TokenFactory;

  return { controller, curveImpl, mockRouter, factory, deployer };
}

async function createToken(
  factory: TokenFactory,
  creator: HardhatEthersSigner,
  name = "Test Token",
  symbol = "TEST"
): Promise<{ token: LaunchToken; curve: BondingCurve }> {
  const tx = await factory
    .connect(creator)
    .createToken(name, symbol, { value: CREATION_FEE });
  const receipt = await tx.wait();

  const iface = factory.interface;

  let tokenAddr = "";
  let curveAddr = "";

  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === "TokenCreated") {
        tokenAddr = parsed.args.token;
        curveAddr = parsed.args.curve;
      }
    } catch {}
  }

  const token = (await ethers.getContractAt("LaunchToken", tokenAddr)) as unknown as LaunchToken;
  const curve = (await ethers.getContractAt("BondingCurve", curveAddr)) as unknown as BondingCurve;
  return { token, curve };
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe("N.W.O Launchpad — Phase 1", function () {
  let deployer: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  let controller: LaunchpadController;
  let factory: TokenFactory;

  beforeEach(async () => {
    [deployer, treasury, alice, bob] = await ethers.getSigners();
    ({ controller, factory } = await deployAll(treasury));
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("LaunchpadController", () => {
    it("stores initial config correctly", async () => {
      expect(await controller.feeBps()).to.equal(FEE_BPS);
      expect(await controller.creationFee()).to.equal(CREATION_FEE);
      expect(await controller.graduationThreshold()).to.equal(GRADUATION_THRESHOLD);
      expect(await controller.treasury()).to.equal(treasury.address);
    });

    it("owner can update fee", async () => {
      await controller.connect(deployer).setFeeBps(200n);
      expect(await controller.feeBps()).to.equal(200n);
    });

    it("reverts if fee > 10%", async () => {
      await expect(controller.setFeeBps(1001n)).to.be.revertedWith(
        "Controller: fee > 10%"
      );
    });

    it("owner can pause and unpause", async () => {
      await controller.connect(deployer).pause();
      expect(await controller.paused()).to.be.true;
      await controller.connect(deployer).unpause();
      expect(await controller.paused()).to.be.false;
    });

    it("non-owner cannot change settings", async () => {
      await expect(controller.connect(alice).setFeeBps(50n)).to.be.reverted;
      await expect(controller.connect(alice).pause()).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("TokenFactory — createToken", () => {
    it("deploys token and curve, emits TokenCreated", async () => {
      const tx = factory.connect(alice).createToken("Alpha", "ALP", { value: CREATION_FEE });
      await expect(tx).to.emit(factory, "TokenCreated");
    });

    it("reverts if creation fee not paid", async () => {
      await expect(
        factory.connect(alice).createToken("Alpha", "ALP", { value: 0 })
      ).to.be.revertedWith("Factory: insufficient creation fee");
    });

    it("forwards creation fee to treasury", async () => {
      const before = await ethers.provider.getBalance(treasury.address);
      await factory.connect(alice).createToken("Alpha", "ALP", { value: CREATION_FEE });
      const after = await ethers.provider.getBalance(treasury.address);
      expect(after - before).to.equal(CREATION_FEE);
    });

    it("refunds overpayment to creator", async () => {
      const overpay = CREATION_FEE + ethers.parseEther("5");
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await factory
        .connect(alice)
        .createToken("Alpha", "ALP", { value: overpay });
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);
      // alice spent creation fee + gas, got 5 CRO back
      expect(before - after - gasCost).to.be.closeTo(CREATION_FEE, ethers.parseEther("0.001"));
    });

    it("mints entire supply to the bonding curve", async () => {
      const { token, curve } = await createToken(factory, alice);
      const curveAddr = await curve.getAddress();
      const totalSupply = await token.totalSupply();
      expect(await token.balanceOf(curveAddr)).to.equal(totalSupply);
    });

    it("increments totalTokens counter", async () => {
      expect(await factory.totalTokens()).to.equal(0n);
      await createToken(factory, alice);
      expect(await factory.totalTokens()).to.equal(1n);
      await createToken(factory, alice, "Beta", "BET");
      expect(await factory.totalTokens()).to.equal(2n);
    });

    it("reverts when factory is paused", async () => {
      await controller.connect(deployer).pause();
      await expect(
        factory.connect(alice).createToken("Alpha", "ALP", { value: CREATION_FEE })
      ).to.be.revertedWith("Factory: paused");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("BondingCurve — buy", () => {
    let token: LaunchToken;
    let curve: BondingCurve;

    beforeEach(async () => {
      ({ token, curve } = await createToken(factory, deployer));
    });

    it("returns tokens proportional to constant-product formula", async () => {
      const croIn = ethers.parseEther("10");
      const fee = (croIn * FEE_BPS) / BPS_DENOM;
      const netCro = croIn - fee;

      const quoted = await curve.getTokensOut(netCro);
      expect(quoted).to.be.gt(0n);

      const beforeBal = await token.balanceOf(alice.address);
      await curve.connect(alice).buy(quoted, { value: croIn });
      const afterBal = await token.balanceOf(alice.address);

      expect(afterBal - beforeBal).to.equal(quoted);
    });

    it("sends fee to treasury", async () => {
      const croIn = ethers.parseEther("10");
      const expectedFee = (croIn * FEE_BPS) / BPS_DENOM;

      const before = await ethers.provider.getBalance(treasury.address);
      await curve.connect(alice).buy(0n, { value: croIn });
      const after = await ethers.provider.getBalance(treasury.address);

      expect(after - before).to.equal(expectedFee);
    });

    it("price increases monotonically with sequential buys", async () => {
      const prices: bigint[] = [];
      for (let i = 0; i < 5; i++) {
        prices.push(await curve.currentPrice());
        await curve.connect(alice).buy(0n, { value: ethers.parseEther("5") });
      }
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).to.be.gt(prices[i - 1]);
      }
    });

    it("reverts on slippage violation", async () => {
      const croIn = ethers.parseEther("1");
      const fee = (croIn * FEE_BPS) / BPS_DENOM;
      const netCro = croIn - fee;
      const quoted = await curve.getTokensOut(netCro);
      const tooHigh = quoted + 1n;

      await expect(
        curve.connect(alice).buy(tooHigh, { value: croIn })
      ).to.be.revertedWith("BondingCurve: slippage");
    });

    it("reverts when paused", async () => {
      await controller.connect(deployer).pause();
      await expect(
        curve.connect(alice).buy(0n, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("BondingCurve: paused");
    });

    it("reverts when zero value sent", async () => {
      await expect(curve.connect(alice).buy(0n, { value: 0n })).to.be.revertedWith(
        "BondingCurve: zero value"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("BondingCurve — sell", () => {
    let token: LaunchToken;
    let curve: BondingCurve;

    beforeEach(async () => {
      ({ token, curve } = await createToken(factory, deployer));
      // Alice buys some tokens first
      await curve.connect(alice).buy(0n, { value: ethers.parseEther("20") });
    });

    it("returns CRO for tokens, charges fee", async () => {
      const tokensIn = (await token.balanceOf(alice.address)) / 2n;
      const rawCro = await curve.getCroOut(tokensIn);
      const fee = (rawCro * FEE_BPS) / BPS_DENOM;
      const expectedCro = rawCro - fee;

      await token.connect(alice).approve(await curve.getAddress(), tokensIn);

      const before = await ethers.provider.getBalance(alice.address);
      const tx = await curve.connect(alice).sell(tokensIn, 0n);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(alice.address);

      expect(after - before + gasCost).to.be.closeTo(
        expectedCro,
        ethers.parseEther("0.001")
      );
    });

    it("price decreases monotonically after sequential sells", async () => {
      // Bob also buys so price is elevated
      await curve.connect(bob).buy(0n, { value: ethers.parseEther("20") });

      const aliceTokens = await token.balanceOf(alice.address);
      const chunk = aliceTokens / 5n;
      await token.connect(alice).approve(await curve.getAddress(), aliceTokens);

      const prices: bigint[] = [];
      for (let i = 0; i < 5; i++) {
        prices.push(await curve.currentPrice());
        await curve.connect(alice).sell(chunk, 0n);
      }
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).to.be.lt(prices[i - 1]);
      }
    });

    it("reverts on slippage violation", async () => {
      const tokensIn = await token.balanceOf(alice.address);
      const rawCro = await curve.getCroOut(tokensIn);
      const fee = (rawCro * FEE_BPS) / BPS_DENOM;
      const expectedCro = rawCro - fee;

      await token.connect(alice).approve(await curve.getAddress(), tokensIn);

      await expect(
        curve.connect(alice).sell(tokensIn, expectedCro + 1n)
      ).to.be.revertedWith("BondingCurve: slippage");
    });

    it("reverts when paused", async () => {
      await controller.connect(deployer).pause();
      const tokensIn = await token.balanceOf(alice.address);
      await token.connect(alice).approve(await curve.getAddress(), tokensIn);
      await expect(curve.connect(alice).sell(tokensIn, 0n)).to.be.revertedWith(
        "BondingCurve: paused"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("BondingCurve — graduation", () => {
    it("graduates when realCroRaised reaches threshold", async () => {
      // Deploy with a low threshold so we can hit it cheaply
      const { factory: f2 } = await deployAll(treasury, ethers.parseEther("50"));
      const { curve } = await createToken(f2, deployer);

      // Keep buying until graduated
      for (let i = 0; i < 20; i++) {
        if (await curve.graduated()) break;
        await curve.connect(alice).buy(0n, { value: ethers.parseEther("5") });
      }

      expect(await curve.graduated()).to.be.true;
    });

    it("emits Graduated event", async () => {
      const { factory: f2 } = await deployAll(treasury, ethers.parseEther("50"));
      const { curve } = await createToken(f2, deployer);

      let graduated = false;
      for (let i = 0; i < 20; i++) {
        const tx = await curve.connect(alice).buy(0n, { value: ethers.parseEther("5") });
        const receipt = await tx.wait();
        for (const log of receipt!.logs) {
          try {
            const parsed = curve.interface.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name === "Graduated") graduated = true;
          } catch {}
        }
        if (graduated) break;
      }
      expect(graduated).to.be.true;
    });

    it("blocks buy after graduation", async () => {
      const { factory: f2 } = await deployAll(treasury, ethers.parseEther("50"));
      const { curve } = await createToken(f2, deployer);

      for (let i = 0; i < 25; i++) {
        if (await curve.graduated()) break;
        try {
          await curve.connect(alice).buy(0n, { value: ethers.parseEther("5") });
        } catch {}
      }

      expect(await curve.graduated()).to.be.true;
      await expect(
        curve.connect(bob).buy(0n, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("BondingCurve: graduated");
    });

    it("blocks sell after graduation", async () => {
      const { factory: f2 } = await deployAll(treasury, ethers.parseEther("50"));
      const { token, curve } = await createToken(f2, deployer);

      // Alice buys some first
      await curve.connect(alice).buy(0n, { value: ethers.parseEther("3") });

      // Graduate it
      for (let i = 0; i < 25; i++) {
        if (await curve.graduated()) break;
        try {
          await curve.connect(bob).buy(0n, { value: ethers.parseEther("5") });
        } catch {}
      }

      const aliceTokens = await token.balanceOf(alice.address);
      await token.connect(alice).approve(await curve.getAddress(), aliceTokens);

      await expect(
        curve.connect(alice).sell(aliceTokens, 0n)
      ).to.be.revertedWith("BondingCurve: graduated");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("BondingCurve — anti-bot", () => {
    it("enforces per-wallet cap in the first N blocks", async () => {
      // anti-bot max = 5% of 1B = 50M tokens
      const { factory: f2 } = await deployAll(treasury, GRADUATION_THRESHOLD);
      const { curve } = await createToken(f2, alice);

      // Try to buy a huge amount — should hit anti-bot cap
      await expect(
        curve.connect(bob).buy(0n, { value: ethers.parseEther("5000") })
      ).to.be.revertedWith("BondingCurve: anti-bot cap");
    });

    it("enforces buy cooldown between consecutive buys", async () => {
      // Deploy with a 60-second cooldown
      const Controller = await ethers.getContractFactory("LaunchpadController");
      const ctrl = await Controller.deploy(
        treasury.address,
        FEE_BPS,
        CREATION_FEE,
        NFT_CREATION_FEE,
        GRADUATION_THRESHOLD,
        ANTI_BOT_BLOCKS,
        ANTI_BOT_MAX_BPS,
        60n // 60-second cooldown
      );
      const CurveImpl = await ethers.getContractFactory("BondingCurve");
      const impl = await CurveImpl.deploy();
      const MockRouter = await ethers.getContractFactory("MockVVSRouter");
      const router = await MockRouter.deploy();
      const Factory = await ethers.getContractFactory("TokenFactory");
      const fac = await Factory.deploy(
        await ctrl.getAddress(),
        await router.getAddress(),
        await impl.getAddress()
      );
      const { curve } = await createToken(fac as unknown as TokenFactory, deployer);

      // First buy succeeds
      await curve.connect(alice).buy(0n, { value: ethers.parseEther("1") });

      // Immediate second buy should fail
      await expect(
        curve.connect(alice).buy(0n, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("BondingCurve: cooldown active");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("BondingCurve — accounting invariants", () => {
    it("reserves update consistently across buy/sell cycles", async () => {
      const { curve } = await createToken(factory, deployer);

      const initialCro = await curve.croReserves();
      const initialTokens = await curve.tokenReserves();

      // Buy
      await curve.connect(alice).buy(0n, { value: ethers.parseEther("10") });

      const afterBuyCro = await curve.croReserves();
      const afterBuyTokens = await curve.tokenReserves();
      expect(afterBuyCro).to.be.gt(initialCro);
      expect(afterBuyTokens).to.be.lt(initialTokens);

      // Sell back a portion
      const tokenAddr = await curve.token();
      const tok = (await ethers.getContractAt("LaunchToken", tokenAddr)) as unknown as LaunchToken;
      const aliceBal = await tok.balanceOf(alice.address);
      const half = aliceBal / 2n;
      await tok.connect(alice).approve(await curve.getAddress(), half);
      await curve.connect(alice).sell(half, 0n);

      const afterSellCro = await curve.croReserves();
      const afterSellTokens = await curve.tokenReserves();
      expect(afterSellCro).to.be.lt(afterBuyCro);
      expect(afterSellTokens).to.be.gt(afterBuyTokens);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Security", () => {
    it("initialize cannot be called twice on the curve", async () => {
      const { curve } = await createToken(factory, deployer);
      await expect(
        curve.initialize(
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          0n,
          0n
        )
      ).to.be.revertedWith("BondingCurve: already initialized");
    });

    it("factory.setCurveImplementation is owner-only", async () => {
      await expect(
        factory.connect(alice).setCurveImplementation(ZERO_ADDRESS)
      ).to.be.reverted;
    });
  });
});