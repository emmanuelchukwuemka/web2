// Contract addresses (from env) and minimal ABIs for wagmi hooks.

export const ADDRESSES = {
  controller:   (process.env.NEXT_PUBLIC_CONTROLLER_ADDRESS    ?? "") as `0x${string}`,
  tokenFactory: (process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS ?? "") as `0x${string}`,
  nftFactory:   (process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS   ?? "") as `0x${string}`,
  staking:      (process.env.NEXT_PUBLIC_STAKING_ADDRESS       ?? "") as `0x${string}`,
  wolf:         (process.env.NEXT_PUBLIC_WOLF_ADDRESS          ?? "") as `0x${string}`,
} as const;

// ── TokenFactory ──────────────────────────────────────────────────────────────

export const TOKEN_FACTORY_ABI = [
  {
    name: "createToken",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "name_",   type: "string" },
      { name: "symbol_", type: "string" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
    ],
  },
  {
    name: "totalTokens",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── BondingCurve ──────────────────────────────────────────────────────────────

export const BONDING_CURVE_ABI = [
  {
    name: "buy",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "minTokensOut", type: "uint256" }],
    outputs: [],
  },
  {
    name: "sell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokensIn",  type: "uint256" },
      { name: "minCroOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getTokensOut",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "croIn", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getCroOut",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokensIn", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "currentPrice",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "graduated",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "realCroRaised",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "croReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenReserves",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── ERC-20 (token + WOLF) ─────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// ── NFTFactory ────────────────────────────────────────────────────────────────

export const NFT_FACTORY_ABI = [
  {
    name: "createCollection",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "name",   type: "string" },
          { name: "symbol", type: "string" },
          { name: "baseURI", type: "string" },
          {
            name: "config",
            type: "tuple",
            components: [
              { name: "maxSupply",          type: "uint256" },
              { name: "mintPrice",          type: "uint256" },
              { name: "presaleMintPrice",   type: "uint256" },
              { name: "maxPerWallet",       type: "uint256" },
              { name: "presaleMaxPerWallet",type: "uint256" },
              { name: "royaltyBps",         type: "uint96"  },
              { name: "fundsReceiver",      type: "address" },
              { name: "presaleStart",       type: "uint256" },
              { name: "presaleEnd",         type: "uint256" },
              { name: "publicStart",        type: "uint256" },
              { name: "merkleRoot",         type: "bytes32" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "collection", type: "address" }],
  },
  {
    name: "totalCollections",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── NFTCollection ─────────────────────────────────────────────────────────────

export const NFT_COLLECTION_ABI = [
  {
    name: "publicMint",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "quantity", type: "uint256" }],
    outputs: [],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Staking ───────────────────────────────────────────────────────────────────

export const STAKING_ABI = [
  {
    name: "stake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "unstake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "pendingRewards",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalStaked",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "userInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "stakedAmount", type: "uint256" },
      { name: "rewardDebt",   type: "uint256" },
    ],
  },
  {
    name: "emergencyUnstake",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "pause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "unpause",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "depositFees",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

// ── LaunchpadController (admin) ───────────────────────────────────────────────

export const CONTROLLER_ABI = [
  // ── Views ──
  { name: "owner",               type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "paused",              type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool"    }] },
  { name: "feeBps",              type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "creationFee",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "nftCreationFee",      type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "graduationThreshold", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "antiBotBlocks",       type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "antiBotMaxBps",       type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "buyCooldown",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "treasury",            type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  // ── Setters ──
  { name: "setFeeBps",              type: "function", stateMutability: "nonpayable", inputs: [{ name: "_feeBps",     type: "uint256" }], outputs: [] },
  { name: "setCreationFee",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "_fee",        type: "uint256" }], outputs: [] },
  { name: "setNftCreationFee",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "_fee",        type: "uint256" }], outputs: [] },
  { name: "setGraduationThreshold", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_threshold",  type: "uint256" }], outputs: [] },
  { name: "setTreasury",            type: "function", stateMutability: "nonpayable", inputs: [{ name: "_treasury",   type: "address" }], outputs: [] },
  {
    name: "setAntiBotParams",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_blocks",  type: "uint256" },
      { name: "_maxBps",  type: "uint256" },
      { name: "_cooldown",type: "uint256" },
    ],
    outputs: [],
  },
  { name: "pause",   type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "unpause", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "setBlocklist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet",  type: "address" },
      { name: "blocked", type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "blocklisted",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ── TokenFactory (admin) ──────────────────────────────────────────────────────

export const TOKEN_FACTORY_ADMIN_ABI = [
  { name: "owner",              type: "function", stateMutability: "view",        inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "curveImplementation",type: "function", stateMutability: "view",        inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "totalTokens",        type: "function", stateMutability: "view",        inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    name: "setCurveImplementation",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newImpl", type: "address" }],
    outputs: [],
  },
] as const;