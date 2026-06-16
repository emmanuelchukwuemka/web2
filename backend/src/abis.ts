// Minimal ABI fragments — only events and view functions used by the indexer/API.

export const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
] as const;

export const TOKEN_FACTORY_ABI = [
  "event TokenCreated(address indexed token, address indexed curve, address indexed creator, string name, string symbol, uint256 timestamp)",
] as const;

export const BONDING_CURVE_ABI = [
  "event Buy(address indexed buyer, uint256 croIn, uint256 tokensOut, uint256 fee)",
  "event Sell(address indexed seller, uint256 tokensIn, uint256 croOut, uint256 fee)",
  "event Graduated(address indexed token, uint256 croForLp, uint256 tokensForLp, address pair)",
  "function currentPrice() view returns (uint256)",
  "function croReserves() view returns (uint256)",
  "function tokenReserves() view returns (uint256)",
  "function realCroRaised() view returns (uint256)",
  "function graduated() view returns (bool)",
] as const;

export const NFT_FACTORY_ABI = [
  "event CollectionCreated(address indexed collection, address indexed creator, string name, string symbol, uint256 maxSupply, uint256 timestamp)",
] as const;

export const STAKING_ABI = [
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event Claimed(address indexed user, uint256 reward)",
  "event FeesDeposited(address indexed from, uint256 amount)",
  "function totalStaked() view returns (uint256)",
  "function accCroPerShare() view returns (uint256)",
  "function pendingRewards(address user) view returns (uint256)",
] as const;