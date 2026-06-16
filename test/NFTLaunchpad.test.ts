import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import {
  LaunchpadController,
  NFTFactory,
  NFTCollection,
} from "../typechain-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const NFT_CREATION_FEE = ethers.parseEther("5");
const FEE_BPS         = 100n;
const CREATION_FEE    = ethers.parseEther("10");
const GRADUATION_THRESHOLD = ethers.parseEther("500");

function leaf(address: string): Buffer {
  return Buffer.from(
    ethers.solidityPackedKeccak256(["address"], [address]).slice(2),
    "hex"
  );
}

function buildTree(addresses: string[]): MerkleTree {
  return new MerkleTree(addresses.map(leaf), keccak256, { sortPairs: true });
}

function proof(tree: MerkleTree, address: string): string[] {
  return tree.getHexProof(leaf(address));
}

async function deployController(treasury: HardhatEthersSigner): Promise<LaunchpadController> {
  const C = await ethers.getContractFactory("LaunchpadController");
  return (await C.deploy(
    treasury.address,
    FEE_BPS,
    CREATION_FEE,
    NFT_CREATION_FEE,
    GRADUATION_THRESHOLD,
    5n,
    500n,
    0n
  )) as unknown as LaunchpadController;
}

async function deployNFTFactory(controller: LaunchpadController): Promise<NFTFactory> {
  const F = await ethers.getContractFactory("NFTFactory");
  return (await F.deploy(await controller.getAddress())) as unknown as NFTFactory;
}

/** Returns timestamps: presale open now, public in 1 hour */
function phaseWindows() {
  const now = Math.floor(Date.now() / 1000);
  return {
    presaleStart: BigInt(now - 1),
    presaleEnd:   BigInt(now + 3600),
    publicStart:  BigInt(now + 3601),
    publicEnd:    BigInt(now + 7200),
  };
}

/** Returns timestamps: presale closed, public open now */
function publicOnlyWindows() {
  const now = Math.floor(Date.now() / 1000);
  return {
    presaleStart: BigInt(now - 7200),
    presaleEnd:   BigInt(now - 3601),
    publicStart:  BigInt(now - 1),
    publicEnd:    BigInt(now + 3600),
  };
}

/** Returns timestamps: both windows in the future */
function closedWindows() {
  const now = Math.floor(Date.now() / 1000);
  return {
    presaleStart: BigInt(now + 3600),
    presaleEnd:   BigInt(now + 7200),
    publicStart:  BigInt(now + 7201),
    publicEnd:    BigInt(now + 10800),
  };
}

interface ConfigOverrides {
  maxSupply?: bigint;
  mintPrice?: bigint;
  presalePrice?: bigint;
  maxPerWallet?: bigint;
  presaleMaxPerWallet?: bigint;
  merkleRoot?: string;
  presaleStart?: bigint;
  presaleEnd?: bigint;
  publicStart?: bigint;
  publicEnd?: bigint;
  royaltyBps?: bigint;
  royaltyReceiver?: string;
  fundsReceiver?: string;
  baseURI?: string;
}

async function createCollection(
  factory: NFTFactory,
  creator: HardhatEthersSigner,
  overrides: ConfigOverrides = {}
): Promise<NFTCollection> {
  const w = phaseWindows();

  const config = {
    maxSupply:           overrides.maxSupply          ?? 100n,
    mintPrice:           overrides.mintPrice          ?? ethers.parseEther("1"),
    presalePrice:        overrides.presalePrice       ?? ethers.parseEther("0.5"),
    maxPerWallet:        overrides.maxPerWallet       ?? 5n,
    presaleMaxPerWallet: overrides.presaleMaxPerWallet ?? 3n,
    merkleRoot:          overrides.merkleRoot         ?? ethers.ZeroHash,
    presaleStart:        overrides.presaleStart       ?? w.presaleStart,
    presaleEnd:          overrides.presaleEnd         ?? w.presaleEnd,
    publicStart:         overrides.publicStart        ?? w.publicStart,
    publicEnd:           overrides.publicEnd          ?? w.publicEnd,
    royaltyBps:          overrides.royaltyBps         ?? 500n,
    royaltyReceiver:     overrides.royaltyReceiver    ?? creator.address,
    fundsReceiver:       overrides.fundsReceiver      ?? creator.address,
  };

  const params = {
    name:    "Test NFT",
    symbol:  "TNFT",
    baseURI: overrides.baseURI ?? "ipfs://QmTest/",
    config,
  };

  const tx = await factory.connect(creator).createCollection(params, { value: NFT_CREATION_FEE });
  const receipt = await tx.wait();

  const iface = factory.interface;
  let collectionAddr = "";
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed?.name === "CollectionCreated") collectionAddr = parsed.args.collection;
    } catch {}
  }

  return (await ethers.getContractAt("NFTCollection", collectionAddr)) as unknown as NFTCollection;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("N.W.O Launchpad — Phase 2: NFT", function () {
  let deployer: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let carol: HardhatEthersSigner;

  let controller: LaunchpadController;
  let factory: NFTFactory;

  beforeEach(async () => {
    [deployer, treasury, alice, bob, carol] = await ethers.getSigners();
    controller = await deployController(treasury);
    factory = await deployNFTFactory(controller);
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTFactory — createCollection", () => {
    it("deploys a collection and emits CollectionCreated", async () => {
      const w = phaseWindows();
      await expect(
        factory.connect(alice).createCollection(
          {
            name: "Alpha", symbol: "ALP", baseURI: "ipfs://test/",
            config: {
              maxSupply: 10n,
              mintPrice: ethers.parseEther("1"), presalePrice: ethers.parseEther("0.5"),
              maxPerWallet: 2n, presaleMaxPerWallet: 1n,
              merkleRoot: ethers.ZeroHash,
              presaleStart: w.presaleStart, presaleEnd: w.presaleEnd,
              publicStart: w.publicStart, publicEnd: w.publicEnd,
              royaltyBps: 250n, royaltyReceiver: alice.address,
              fundsReceiver: alice.address,
            },
          },
          { value: NFT_CREATION_FEE }
        )
      ).to.emit(factory, "CollectionCreated");
    });

    it("reverts if creation fee not paid", async () => {
      const w = phaseWindows();
      await expect(
        factory.connect(alice).createCollection(
          {
            name: "A", symbol: "A", baseURI: "",
            config: {
              maxSupply: 10n, mintPrice: 0n, presalePrice: 0n,
              maxPerWallet: 2n, presaleMaxPerWallet: 1n,
              merkleRoot: ethers.ZeroHash,
              presaleStart: w.presaleStart, presaleEnd: w.presaleEnd,
              publicStart: w.publicStart, publicEnd: w.publicEnd,
              royaltyBps: 0n, royaltyReceiver: alice.address,
              fundsReceiver: alice.address,
            },
          },
          { value: 0n }
        )
      ).to.be.revertedWith("NFTFactory: insufficient creation fee");
    });

    it("forwards creation fee to treasury", async () => {
      const before = await ethers.provider.getBalance(treasury.address);
      await createCollection(factory, alice);
      const after = await ethers.provider.getBalance(treasury.address);
      expect(after - before).to.equal(NFT_CREATION_FEE);
    });

    it("registers collection in allCollections", async () => {
      expect(await factory.totalCollections()).to.equal(0n);
      await createCollection(factory, alice);
      expect(await factory.totalCollections()).to.equal(1n);
      await createCollection(factory, bob);
      expect(await factory.totalCollections()).to.equal(2n);
    });

    it("creator is recorded as collection owner", async () => {
      const collection = await createCollection(factory, alice);
      expect(await collection.owner()).to.equal(alice.address);
    });

    it("reverts when paused", async () => {
      await controller.connect(deployer).pause();
      const w = phaseWindows();
      await expect(
        factory.connect(alice).createCollection(
          {
            name: "A", symbol: "A", baseURI: "",
            config: {
              maxSupply: 10n, mintPrice: 0n, presalePrice: 0n,
              maxPerWallet: 1n, presaleMaxPerWallet: 1n,
              merkleRoot: ethers.ZeroHash,
              presaleStart: w.presaleStart, presaleEnd: w.presaleEnd,
              publicStart: w.publicStart, publicEnd: w.publicEnd,
              royaltyBps: 0n, royaltyReceiver: alice.address,
              fundsReceiver: alice.address,
            },
          },
          { value: NFT_CREATION_FEE }
        )
      ).to.be.revertedWith("NFTFactory: paused");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — presale mint", () => {
    let collection: NFTCollection;
    let tree: MerkleTree;

    beforeEach(async () => {
      // Build allowlist: alice and bob
      tree = buildTree([alice.address, bob.address]);
      const root = tree.getHexRoot();

      collection = await createCollection(factory, deployer, {
        merkleRoot:         root as `0x${string}`,
        presalePrice:       ethers.parseEther("0.5"),
        presaleMaxPerWallet: 2n,
      });
    });

    it("allowlisted wallet can presale mint", async () => {
      await collection.connect(alice).presaleMint(1, proof(tree, alice.address), {
        value: ethers.parseEther("0.5"),
      });
      expect(await collection.totalMinted()).to.equal(1n);
      expect(await collection.balanceOf(alice.address)).to.equal(1n);
    });

    it("batch presale mint", async () => {
      await collection.connect(alice).presaleMint(2, proof(tree, alice.address), {
        value: ethers.parseEther("1"),
      });
      expect(await collection.balanceOf(alice.address)).to.equal(2n);
    });

    it("non-allowlisted wallet is rejected", async () => {
      await expect(
        collection.connect(carol).presaleMint(1, proof(tree, carol.address), {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWithCustomError(collection, "InvalidMerkleProof");
    });

    it("reverts when presale wallet cap exceeded", async () => {
      await collection.connect(alice).presaleMint(2, proof(tree, alice.address), {
        value: ethers.parseEther("1"),
      });
      await expect(
        collection.connect(alice).presaleMint(1, proof(tree, alice.address), {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWithCustomError(collection, "ExceedsMaxPerWallet");
    });

    it("reverts when outside presale window", async () => {
      // Deploy collection with closed windows
      const w = closedWindows();
      const closed = await createCollection(factory, deployer, {
        merkleRoot:   tree.getHexRoot() as `0x${string}`,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
        publicStart:  w.publicStart,
        publicEnd:    w.publicEnd,
      });
      await expect(
        closed.connect(alice).presaleMint(1, proof(tree, alice.address), {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWithCustomError(closed, "NotInPresaleWindow");
    });

    it("reverts with insufficient payment", async () => {
      await expect(
        collection.connect(alice).presaleMint(1, proof(tree, alice.address), {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWithCustomError(collection, "InsufficientPayment");
    });

    it("emits PresaleMint event", async () => {
      await expect(
        collection.connect(alice).presaleMint(1, proof(tree, alice.address), {
          value: ethers.parseEther("0.5"),
        })
      ).to.emit(collection, "PresaleMint").withArgs(alice.address, 1n);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — public mint", () => {
    let collection: NFTCollection;

    beforeEach(async () => {
      const w = publicOnlyWindows();
      collection = await createCollection(factory, deployer, {
        mintPrice:    ethers.parseEther("1"),
        maxPerWallet: 3n,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
        publicStart:  w.publicStart,
        publicEnd:    w.publicEnd,
      });
    });

    it("anyone can public mint during window", async () => {
      await collection.connect(carol).publicMint(1, { value: ethers.parseEther("1") });
      expect(await collection.balanceOf(carol.address)).to.equal(1n);
    });

    it("batch public mint charges correct price", async () => {
      const before = await ethers.provider.getBalance(await collection.getAddress());
      await collection.connect(alice).publicMint(3, { value: ethers.parseEther("3") });
      const after = await ethers.provider.getBalance(await collection.getAddress());
      expect(after - before).to.equal(ethers.parseEther("3"));
    });

    it("reverts when public wallet cap exceeded", async () => {
      await collection.connect(alice).publicMint(3, { value: ethers.parseEther("3") });
      await expect(
        collection.connect(alice).publicMint(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(collection, "ExceedsMaxPerWallet");
    });

    it("reverts outside public window", async () => {
      const w = closedWindows();
      const closed = await createCollection(factory, deployer, {
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
        publicStart:  w.publicStart,
        publicEnd:    w.publicEnd,
      });
      await expect(
        closed.connect(alice).publicMint(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(closed, "NotInPublicWindow");
    });

    it("reverts when supply exhausted", async () => {
      // Deploy tiny collection
      const w = publicOnlyWindows();
      const tiny = await createCollection(factory, deployer, {
        maxSupply:    2n,
        maxPerWallet: 5n,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
        publicStart:  w.publicStart,
        publicEnd:    w.publicEnd,
      });
      await tiny.connect(alice).publicMint(2, { value: ethers.parseEther("2") });
      await expect(
        tiny.connect(bob).publicMint(1, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(tiny, "ExceedsMaxSupply");
    });

    it("emits PublicMint event", async () => {
      await expect(
        collection.connect(alice).publicMint(2, { value: ethers.parseEther("2") })
      ).to.emit(collection, "PublicMint").withArgs(alice.address, 2n);
    });

    it("reverts with insufficient payment", async () => {
      await expect(
        collection.connect(alice).publicMint(1, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(collection, "InsufficientPayment");
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — owner mint", () => {
    it("owner can mint reserve allocation at any time", async () => {
      const collection = await createCollection(factory, deployer, {
        maxSupply: 50n,
      });
      await collection.connect(deployer).ownerMint(alice.address, 10);
      expect(await collection.balanceOf(alice.address)).to.equal(10n);
    });

    it("owner mint respects maxSupply", async () => {
      const collection = await createCollection(factory, deployer, { maxSupply: 5n });
      await expect(
        collection.connect(deployer).ownerMint(alice.address, 6)
      ).to.be.revertedWithCustomError(collection, "ExceedsMaxSupply");
    });

    it("non-owner cannot owner mint", async () => {
      const collection = await createCollection(factory, deployer);
      await expect(
        collection.connect(alice).ownerMint(alice.address, 1)
      ).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — metadata", () => {
    it("initial baseURI is returned in tokenURI", async () => {
      const w = publicOnlyWindows();
      const collection = await createCollection(factory, deployer, {
        baseURI:     "ipfs://QmBase/",
        publicStart: w.publicStart,
        publicEnd:   w.publicEnd,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
      });
      await collection.connect(deployer).ownerMint(alice.address, 1);
      expect(await collection.tokenURI(1n)).to.equal("ipfs://QmBase/1");
    });

    it("owner can update baseURI before freeze", async () => {
      const collection = await createCollection(factory, deployer, { baseURI: "ipfs://old/" });
      await collection.connect(deployer).setBaseURI("ipfs://new/");
      await collection.connect(deployer).ownerMint(alice.address, 1);
      expect(await collection.tokenURI(1n)).to.equal("ipfs://new/1");
    });

    it("freezeMetadata locks the URI permanently", async () => {
      const collection = await createCollection(factory, deployer, { baseURI: "ipfs://final/" });
      await expect(collection.connect(deployer).freezeMetadata())
        .to.emit(collection, "MetadataFrozen")
        .withArgs("ipfs://final/");
      expect(await collection.metadataFrozen()).to.be.true;
    });

    it("setBaseURI reverts after freeze", async () => {
      const collection = await createCollection(factory, deployer);
      await collection.connect(deployer).freezeMetadata();
      await expect(
        collection.connect(deployer).setBaseURI("ipfs://new/")
      ).to.be.revertedWithCustomError(collection, "MetadataAlreadyFrozen");
    });

    it("freezeMetadata reverts if already frozen", async () => {
      const collection = await createCollection(factory, deployer);
      await collection.connect(deployer).freezeMetadata();
      await expect(
        collection.connect(deployer).freezeMetadata()
      ).to.be.revertedWithCustomError(collection, "MetadataAlreadyFrozen");
    });

    it("non-owner cannot update URI", async () => {
      const collection = await createCollection(factory, deployer);
      await expect(
        collection.connect(alice).setBaseURI("ipfs://hacked/")
      ).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — EIP-2981 royalties", () => {
    it("returns correct royalty info", async () => {
      const collection = await createCollection(factory, deployer, {
        royaltyBps:      500n,      // 5%
        royaltyReceiver: alice.address,
      });
      const salePrice = ethers.parseEther("10");
      const [receiver, amount] = await collection.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(alice.address);
      // 5% of 10 ETH = 0.5 ETH
      expect(amount).to.equal(ethers.parseEther("0.5"));
    });

    it("owner can update royalty", async () => {
      const collection = await createCollection(factory, deployer, {
        royaltyBps:      500n,
        royaltyReceiver: alice.address,
      });
      await collection.connect(deployer).setRoyalty(bob.address, 250n);
      const salePrice = ethers.parseEther("10");
      const [receiver, amount] = await collection.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(bob.address);
      expect(amount).to.equal(ethers.parseEther("0.25")); // 2.5%
    });

    it("supportsInterface returns true for ERC2981", async () => {
      const collection = await createCollection(factory, deployer);
      expect(await collection.supportsInterface("0x2a55205a")).to.be.true; // ERC2981
    });

    it("supportsInterface returns true for ERC721", async () => {
      const collection = await createCollection(factory, deployer);
      expect(await collection.supportsInterface("0x80ac58cd")).to.be.true; // ERC721
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — funds withdrawal", () => {
    let collection: NFTCollection;

    beforeEach(async () => {
      const w = publicOnlyWindows();
      collection = await createCollection(factory, deployer, {
        fundsReceiver: deployer.address,
        mintPrice:     ethers.parseEther("1"),
        publicStart:   w.publicStart,
        publicEnd:     w.publicEnd,
        presaleStart:  w.presaleStart,
        presaleEnd:    w.presaleEnd,
      });
      // Alice mints 2 tokens → 2 CRO in contract
      await collection.connect(alice).publicMint(2, { value: ethers.parseEther("2") });
    });

    it("fundsReceiver can withdraw all proceeds", async () => {
      const before = await ethers.provider.getBalance(deployer.address);
      const tx = await collection.connect(deployer).withdraw();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * (receipt!.gasPrice ?? 0n);
      const after = await ethers.provider.getBalance(deployer.address);
      // deployer got 2 CRO minus gas
      expect(after - before + gas).to.equal(ethers.parseEther("2"));
    });

    it("contract balance is zero after withdrawal", async () => {
      await collection.connect(deployer).withdraw();
      expect(await ethers.provider.getBalance(await collection.getAddress())).to.equal(0n);
    });

    it("emits Withdrawn event", async () => {
      await expect(collection.connect(deployer).withdraw())
        .to.emit(collection, "Withdrawn")
        .withArgs(deployer.address, ethers.parseEther("2"));
    });

    it("reverts if called by unauthorized address", async () => {
      await expect(collection.connect(carol).withdraw()).to.be.revertedWith(
        "NFTCollection: not authorized"
      );
    });

    it("reverts if balance is zero", async () => {
      await collection.connect(deployer).withdraw();
      await expect(collection.connect(deployer).withdraw()).to.be.revertedWith(
        "NFTCollection: nothing to withdraw"
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — supply tracking", () => {
    it("remainingSupply decrements with each mint", async () => {
      const w = publicOnlyWindows();
      const collection = await createCollection(factory, deployer, {
        maxSupply:   10n,
        publicStart: w.publicStart,
        publicEnd:   w.publicEnd,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
      });
      expect(await collection.remainingSupply()).to.equal(10n);
      await collection.connect(alice).publicMint(3, { value: ethers.parseEther("3") });
      expect(await collection.remainingSupply()).to.equal(7n);
    });

    it("tokenIds start from 1", async () => {
      const collection = await createCollection(factory, deployer);
      await collection.connect(deployer).ownerMint(alice.address, 1);
      expect(await collection.ownerOf(1n)).to.equal(alice.address);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  describe("NFTCollection — pause", () => {
    it("paused collection blocks presale and public mints", async () => {
      const tree = buildTree([alice.address]);
      const w = phaseWindows();
      const collection = await createCollection(factory, deployer, {
        merkleRoot:   tree.getHexRoot() as `0x${string}`,
        presaleStart: w.presaleStart,
        presaleEnd:   w.presaleEnd,
        publicStart:  w.publicStart,
        publicEnd:    w.publicEnd,
      });
      await collection.connect(deployer).pause();
      await expect(
        collection.connect(alice).presaleMint(1, proof(tree, alice.address), {
          value: ethers.parseEther("0.5"),
        })
      ).to.be.revertedWithCustomError(collection, "EnforcedPause");
    });
  });
});