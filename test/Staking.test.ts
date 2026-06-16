import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { WOLF, Staking } from "../typechain-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1B WOLF

async function deployWolf(holder: HardhatEthersSigner): Promise<WOLF> {
  const F = await ethers.getContractFactory("WOLF");
  return (await F.deploy(holder.address)) as unknown as WOLF;
}

async function deployStaking(wolf: WOLF): Promise<Staking> {
  const F = await ethers.getContractFactory("Staking");
  return (await F.deploy(await wolf.getAddress())) as unknown as Staking;
}

/** Approve and stake `amount` WOLF for `user`. */
async function stakeFor(
  wolf: WOLF,
  staking: Staking,
  user: HardhatEthersSigner,
  amount: bigint
) {
  await wolf.connect(user).approve(await staking.getAddress(), amount);
  await staking.connect(user).stake(amount);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("N.W.O Launchpad — Phase 3: WOLF + Staking", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;
  let feeSource: HardhatEthersSigner;

  let wolf: WOLF;
  let staking: Staking;

  beforeEach(async () => {
    [deployer, alice, bob, carol, feeSource] = await ethers.getSigners();

    wolf = await deployWolf(deployer);
    staking = await deployStaking(wolf);

    // Distribute WOLF for testing: 100M each to alice, bob, carol
    const share = ethers.parseEther("100000000"); // 100M
    await wolf.connect(deployer).transfer(alice.address, share);
    await wolf.connect(deployer).transfer(bob.address, share);
    await wolf.connect(deployer).transfer(carol.address, share);
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("WOLF token", () => {
    it("mints total supply to the initial holder", async () => {
      const remaining = TOTAL_SUPPLY - ethers.parseEther("300000000"); // 700M left with deployer
      expect(await wolf.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await wolf.balanceOf(deployer.address)).to.equal(remaining);
    });

    it("has correct name and symbol", async () => {
      expect(await wolf.name()).to.equal("N.W.O Wolf");
      expect(await wolf.symbol()).to.equal("WOLF");
    });

    it("supports EIP-2612 permit", async () => {
      // supportsInterface not on ERC20, but domain separator exists
      expect(await wolf.DOMAIN_SEPARATOR()).to.not.equal(ethers.ZeroHash);
    });

    it("is transferable", async () => {
      await wolf.connect(alice).transfer(bob.address, ethers.parseEther("1000"));
      expect(await wolf.balanceOf(bob.address)).to.be.gt(ethers.parseEther("100000000"));
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — stake", () => {
    it("accepts WOLF and updates totalStaked", async () => {
      const amount = ethers.parseEther("1000");
      await stakeFor(wolf, staking, alice, amount);
      expect(await staking.totalStaked()).to.equal(amount);
      const info = await staking.userInfo(alice.address);
      expect(info.stakedAmount).to.equal(amount);
    });

    it("transfers WOLF from staker to contract", async () => {
      const amount = ethers.parseEther("500");
      const before = await wolf.balanceOf(alice.address);
      await stakeFor(wolf, staking, alice, amount);
      expect(await wolf.balanceOf(alice.address)).to.equal(before - amount);
      expect(await wolf.balanceOf(await staking.getAddress())).to.equal(amount);
    });

    it("emits Staked event", async () => {
      const amount = ethers.parseEther("100");
      await wolf.connect(alice).approve(await staking.getAddress(), amount);
      await expect(staking.connect(alice).stake(amount))
        .to.emit(staking, "Staked")
        .withArgs(alice.address, amount);
    });

    it("reverts on zero amount", async () => {
      await expect(staking.connect(alice).stake(0n)).to.be.revertedWith("Staking: zero amount");
    });

    it("reverts when paused", async () => {
      await staking.connect(deployer).pause();
      const amount = ethers.parseEther("100");
      await wolf.connect(alice).approve(await staking.getAddress(), amount);
      await expect(staking.connect(alice).stake(amount)).to.be.revertedWithCustomError(
        staking, "EnforcedPause"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — unstake", () => {
    const stakeAmount = ethers.parseEther("1000");

    beforeEach(async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
    });

    it("returns WOLF to staker", async () => {
      const before = await wolf.balanceOf(alice.address);
      await staking.connect(alice).unstake(stakeAmount);
      expect(await wolf.balanceOf(alice.address)).to.equal(before + stakeAmount);
    });

    it("updates totalStaked", async () => {
      await staking.connect(alice).unstake(stakeAmount);
      expect(await staking.totalStaked()).to.equal(0n);
    });

    it("partial unstake leaves remainder staked", async () => {
      const half = stakeAmount / 2n;
      await staking.connect(alice).unstake(half);
      const info = await staking.userInfo(alice.address);
      expect(info.stakedAmount).to.equal(half);
      expect(await staking.totalStaked()).to.equal(half);
    });

    it("emits Unstaked event", async () => {
      await expect(staking.connect(alice).unstake(stakeAmount))
        .to.emit(staking, "Unstaked")
        .withArgs(alice.address, stakeAmount);
    });

    it("reverts when amount exceeds stake", async () => {
      await expect(
        staking.connect(alice).unstake(stakeAmount + 1n)
      ).to.be.revertedWith("Staking: insufficient stake");
    });

    it("reverts on zero amount", async () => {
      await expect(staking.connect(alice).unstake(0n)).to.be.revertedWith("Staking: zero amount");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — fee deposit + reward math", () => {
    const stakeAmount = ethers.parseEther("1000");
    const feeAmount   = ethers.parseEther("10");

    it("depositFees emits FeesDeposited", async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await expect(
        staking.connect(feeSource).depositFees({ value: feeAmount })
      ).to.emit(staking, "FeesDeposited").withArgs(feeSource.address, feeAmount);
    });

    it("single staker receives 100% of fees", async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });

      expect(await staking.pendingRewards(alice.address)).to.equal(feeAmount);
    });

    it("two equal stakers each receive 50% of fees", async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await stakeFor(wolf, staking, bob,   stakeAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });

      const half = feeAmount / 2n;
      expect(await staking.pendingRewards(alice.address)).to.equal(half);
      expect(await staking.pendingRewards(bob.address)).to.equal(half);
    });

    it("staker with 3x the tokens earns 3x the rewards", async () => {
      const bobAmount = stakeAmount * 3n; // bob stakes 3x alice
      await stakeFor(wolf, staking, alice, stakeAmount);
      await stakeFor(wolf, staking, bob,   bobAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });

      const alicePending = await staking.pendingRewards(alice.address);
      const bobPending   = await staking.pendingRewards(bob.address);

      // bob should have ~3× alice (small rounding possible)
      expect(bobPending).to.be.closeTo(alicePending * 3n, 100n);
      // together they absorb 100% of fees
      expect(alicePending + bobPending).to.equal(feeAmount);
    });

    it("late staker does not receive fees deposited before they joined", async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });

      // Bob stakes AFTER the fee deposit
      await stakeFor(wolf, staking, bob, stakeAmount);

      expect(await staking.pendingRewards(alice.address)).to.equal(feeAmount);
      expect(await staking.pendingRewards(bob.address)).to.equal(0n);
    });

    it("accumulates correctly across multiple fee deposits", async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });
      await staking.connect(feeSource).depositFees({ value: feeAmount });
      await staking.connect(feeSource).depositFees({ value: feeAmount });

      expect(await staking.pendingRewards(alice.address)).to.equal(feeAmount * 3n);
    });

    it("fees deposited when nobody is staked are banked for future stakers", async () => {
      // No stakers yet — fee goes into contract balance but accCroPerShare stays 0
      await staking.connect(feeSource).depositFees({ value: feeAmount });
      expect(await staking.accCroPerShare()).to.equal(0n);

      // Alice stakes now — she should NOT get the pre-stake fee
      await stakeFor(wolf, staking, alice, stakeAmount);
      expect(await staking.pendingRewards(alice.address)).to.equal(0n);
    });

    it("reverts depositFees with zero value", async () => {
      await expect(
        staking.connect(feeSource).depositFees({ value: 0n })
      ).to.be.revertedWith("Staking: zero deposit");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — claim", () => {
    const stakeAmount = ethers.parseEther("1000");
    const feeAmount   = ethers.parseEther("10");

    beforeEach(async () => {
      await stakeFor(wolf, staking, alice, stakeAmount);
      await staking.connect(feeSource).depositFees({ value: feeAmount });
    });

    it("claim pays out pending CRO to staker", async () => {
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).claim();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const after = await ethers.provider.getBalance(alice.address);

      expect(after - before + gas).to.equal(feeAmount);
    });

    it("emits Claimed event", async () => {
      await expect(staking.connect(alice).claim())
        .to.emit(staking, "Claimed")
        .withArgs(alice.address, feeAmount);
    });

    it("pendingRewards is zero after claim", async () => {
      await staking.connect(alice).claim();
      expect(await staking.pendingRewards(alice.address)).to.equal(0n);
    });

    it("claim is idempotent — second claim pays nothing", async () => {
      await staking.connect(alice).claim();
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).claim();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const after = await ethers.provider.getBalance(alice.address);
      // net change should be ~0 minus gas
      expect(before - after).to.be.closeTo(gas, ethers.parseEther("0.0001"));
    });

    it("unstake auto-claims pending reward", async () => {
      const before = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).unstake(stakeAmount);
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const after = await ethers.provider.getBalance(alice.address);
      // alice gets back her CRO reward (10 ETH) minus gas
      expect(after - before + gas).to.equal(feeAmount);
    });

    it("fees deposited after stake accumulate correctly with additional stake", async () => {
      // Staking again settles (auto-claims) the first pending fee into alice's wallet,
      // then sets the debt baseline to the new (doubled) staked balance.
      const walletBefore = await ethers.provider.getBalance(alice.address);

      const tx = await (async () => {
        await wolf.connect(alice).approve(await staking.getAddress(), stakeAmount);
        return staking.connect(alice).stake(stakeAmount);
      })();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);

      const walletAfter1 = await ethers.provider.getBalance(alice.address);
      // First fee (10 ETH) auto-claimed to alice's wallet on re-stake.
      // closeTo absorbs the approve tx gas that isn't in `gas`.
      const walletGain = walletAfter1 - walletBefore + gas;
      expect(walletGain).to.be.closeTo(feeAmount, ethers.parseEther("0.001"));

      // Now alice has 2000 WOLF staked. Deposit a second fee — she earns 100%.
      await staking.connect(feeSource).depositFees({ value: feeAmount });
      expect(await staking.pendingRewards(alice.address)).to.equal(feeAmount);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — reward debt correctness", () => {
    it("reward debt prevents double-claiming across stake/unstake cycles", async () => {
      const amount = ethers.parseEther("1000");

      // Round 1: alice stakes, fee deposited, alice claims
      await stakeFor(wolf, staking, alice, amount);
      await staking.connect(feeSource).depositFees({ value: ethers.parseEther("10") });
      await staking.connect(alice).claim();

      // Round 2: alice unstakes and re-stakes (resets debt)
      await staking.connect(alice).unstake(amount);
      await stakeFor(wolf, staking, alice, amount);

      // No new fees deposited — pending should be 0
      expect(await staking.pendingRewards(alice.address)).to.equal(0n);

      // Round 3: new fee deposited — alice should get exactly this fee
      await staking.connect(feeSource).depositFees({ value: ethers.parseEther("5") });
      expect(await staking.pendingRewards(alice.address)).to.equal(ethers.parseEther("5"));
    });

    it("staker joining mid-stream only earns fees from their stake point", async () => {
      const amount = ethers.parseEther("1000");

      // Alice stakes and gets fee 1
      await stakeFor(wolf, staking, alice, amount);
      await staking.connect(feeSource).depositFees({ value: ethers.parseEther("10") });

      // Bob joins — alice and bob now split fee 2 equally
      await stakeFor(wolf, staking, bob, amount);
      await staking.connect(feeSource).depositFees({ value: ethers.parseEther("10") });

      const alicePending = await staking.pendingRewards(alice.address);
      const bobPending   = await staking.pendingRewards(bob.address);

      // Alice earned fee1 (10) + half of fee2 (5) = 15
      expect(alicePending).to.equal(ethers.parseEther("15"));
      // Bob earned only half of fee2 = 5
      expect(bobPending).to.equal(ethers.parseEther("5"));
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — emergency unstake", () => {
    const amount = ethers.parseEther("1000");

    beforeEach(async () => {
      await stakeFor(wolf, staking, alice, amount);
      await staking.connect(feeSource).depositFees({ value: ethers.parseEther("10") });
    });

    it("returns all WOLF without paying pending rewards", async () => {
      const wolfBefore = await wolf.balanceOf(alice.address);
      const croBefore  = await ethers.provider.getBalance(alice.address);

      const tx = await staking.connect(alice).emergencyUnstake();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);

      const wolfAfter = await wolf.balanceOf(alice.address);
      const croAfter  = await ethers.provider.getBalance(alice.address);

      expect(wolfAfter - wolfBefore).to.equal(amount);
      // CRO balance should only change by gas (no reward paid)
      expect(croBefore - croAfter).to.be.closeTo(gas, ethers.parseEther("0.0001"));
    });

    it("emits EmergencyUnstaked event", async () => {
      await expect(staking.connect(alice).emergencyUnstake())
        .to.emit(staking, "EmergencyUnstaked")
        .withArgs(alice.address, amount);
    });

    it("clears staked balance and resets debt", async () => {
      await staking.connect(alice).emergencyUnstake();
      const info = await staking.userInfo(alice.address);
      expect(info.stakedAmount).to.equal(0n);
      expect(info.rewardDebt).to.equal(0n);
    });

    it("works even when contract is paused", async () => {
      await staking.connect(deployer).pause();
      await expect(staking.connect(alice).emergencyUnstake()).to.not.be.reverted;
    });

    it("reverts when nothing is staked", async () => {
      await expect(staking.connect(carol).emergencyUnstake()).to.be.revertedWith(
        "Staking: nothing staked"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — receive() fallback", () => {
    it("direct CRO send distributes fees to stakers", async () => {
      const amount = ethers.parseEther("1000");
      const fee    = ethers.parseEther("5");

      await stakeFor(wolf, staking, alice, amount);

      // Send CRO directly to the staking contract
      await deployer.sendTransaction({ to: await staking.getAddress(), value: fee });

      expect(await staking.pendingRewards(alice.address)).to.equal(fee);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("Staking — admin", () => {
    it("owner can pause and unpause", async () => {
      await staking.connect(deployer).pause();
      expect(await staking.paused()).to.be.true;
      await staking.connect(deployer).unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("non-owner cannot pause", async () => {
      await expect(staking.connect(alice).pause()).to.be.reverted;
    });
  });
});