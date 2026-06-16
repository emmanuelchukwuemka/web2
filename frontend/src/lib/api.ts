const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Token {
  id: number;
  address: string;
  name: string;
  symbol: string;
  creator: string;
  bondingCurve: string;
  graduated: boolean;
  graduatedAt: string | null;
  realCroRaised: string;
  currentPrice: string;
  createdAt: string;
  // metadata
  image: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  // moderation
  featured: boolean;
  flagged: boolean;
  _count?: { trades: number; holders?: number; comments?: number };
}

export interface Trade {
  id: number;
  tokenAddr: string;
  curveAddr: string;
  trader: string;
  isBuy: boolean;
  tokenAmount: string;
  croAmount: string;
  fee: string;
  price: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  token?: { name: string; symbol: string; image: string | null };
}

export interface Candle {
  time: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface TokenHolder {
  holder: string;
  balance: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  tokenAddr: string;
  author: string;
  content: string;
  parentId: number | null;
  createdAt: string;
  replies?: Array<{ id: number; author: string; content: string; createdAt: string }>;
}

export interface NFTCollection {
  id: number;
  address: string;
  name: string;
  symbol: string;
  creator: string;
  maxSupply: number;
  blockNumber: number;
  txHash: string;
  createdAt: string;
}

export interface StakingStats {
  totalFeesDistributed: string;
  liveStats: { totalStaked: string; accCroPerShare: string } | null;
  eventCounts: Record<string, number>;
}

export interface StakingEvent {
  id: number;
  user: string | null;
  from: string | null;
  eventType: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

export interface BlockedWallet {
  address: string;
  reason: string | null;
  blockedBy: string;
  blockedAt: string;
}

export interface Profile {
  address: string;
  createdTokens: Array<Pick<Token, "address" | "name" | "symbol" | "image" | "graduated" | "realCroRaised" | "currentPrice" | "createdAt"> & { _count: { trades: number } }>;
  recentTrades: Trade[];
  totalTrades: number;
}

interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string, adminKey?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "DELETE",
    headers: adminKey ? { Authorization: `Bearer ${adminKey}` } : {},
    cache:   "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

function adminHeaders(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}` };
}

// ── IPFS upload ───────────────────────────────────────────────────────────────

export async function uploadToIPFS(file: File): Promise<string> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) throw new Error("NEXT_PUBLIC_PINATA_JWT not set");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method:  "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body:    form,
  });
  if (!res.ok) throw new Error("Pinata upload failed");
  const data = await res.json() as { IpfsHash: string };
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

// ── Token endpoints ───────────────────────────────────────────────────────────

export async function fetchTokens(params?: {
  page?: number; limit?: number;
  sort?: "createdAt" | "realCroRaised" | "currentPrice";
  order?: "asc" | "desc";
  graduated?: boolean; q?: string; creator?: string; featured?: boolean;
}): Promise<PagedResult<Token>> {
  const qs = new URLSearchParams();
  if (params?.page)      qs.set("page",      String(params.page));
  if (params?.limit)     qs.set("limit",     String(params.limit));
  if (params?.sort)      qs.set("sort",      params.sort);
  if (params?.order)     qs.set("order",     params.order);
  if (params?.graduated !== undefined) qs.set("graduated", String(params.graduated));
  if (params?.q)         qs.set("q",         params.q);
  if (params?.creator)   qs.set("creator",   params.creator);
  if (params?.featured)  qs.set("featured",  "true");
  return get<PagedResult<Token>>(`/api/tokens?${qs}`);
}

export async function fetchToken(address: string): Promise<Token> {
  const r = await get<{ data: Token }>(`/api/tokens/${address}`);
  return r.data;
}

export async function updateTokenMetadata(
  address: string,
  meta: { image?: string; description?: string; website?: string; twitter?: string; telegram?: string; discord?: string }
): Promise<void> {
  await put(`/api/tokens/${address}/metadata`, meta);
}

export async function fetchTrades(
  address: string,
  params?: { page?: number; limit?: number; isBuy?: boolean }
): Promise<PagedResult<Trade>> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.isBuy !== undefined) qs.set("isBuy", String(params.isBuy));
  return get<PagedResult<Trade>>(`/api/tokens/${address}/trades?${qs}`);
}

export async function fetchChart(
  address: string,
  interval: "1m" | "5m" | "1h" | "1d" = "5m"
): Promise<Candle[]> {
  const r = await get<{ data: Candle[] }>(`/api/tokens/${address}/chart?interval=${interval}`);
  return r.data;
}

export async function fetchHolders(
  address: string,
  params?: { page?: number; limit?: number }
): Promise<PagedResult<TokenHolder>> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page",  String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  return get<PagedResult<TokenHolder>>(`/api/tokens/${address}/holders?${qs}`);
}

export async function fetchComments(
  address: string,
  params?: { page?: number; limit?: number }
): Promise<PagedResult<Comment>> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page",  String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  return get<PagedResult<Comment>>(`/api/tokens/${address}/comments?${qs}`);
}

export async function postComment(
  address: string,
  body: { author: string; content: string; parentId?: number }
): Promise<Comment> {
  const r = await post<{ data: Comment }>(`/api/tokens/${address}/comments`, body);
  return r.data;
}

// ── NFT endpoints ─────────────────────────────────────────────────────────────

export async function fetchCollections(params?: {
  page?: number; limit?: number; q?: string;
}): Promise<PagedResult<NFTCollection>> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page",  String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.q)     qs.set("q",     params.q);
  return get<PagedResult<NFTCollection>>(`/api/nfts?${qs}`);
}

export async function fetchCollection(address: string): Promise<NFTCollection> {
  const r = await get<{ data: NFTCollection }>(`/api/nfts/${address}`);
  return r.data;
}

// ── Staking endpoints ─────────────────────────────────────────────────────────

export async function fetchStakingStats(): Promise<StakingStats> {
  const r = await get<{ data: StakingStats }>("/api/staking");
  return r.data;
}

export async function fetchStakingEvents(params?: {
  page?: number; limit?: number; type?: string;
}): Promise<PagedResult<StakingEvent>> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set("page",  String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.type)  qs.set("type",  params.type);
  return get<PagedResult<StakingEvent>>(`/api/staking/events?${qs}`);
}

export async function fetchUserStaking(address: string): Promise<{
  pendingRewards: string; history: StakingEvent[];
}> {
  const r = await get<{ data: { pendingRewards: string; history: StakingEvent[] } }>(
    `/api/staking/user/${address}`
  );
  return r.data;
}

// ── Profile endpoint ──────────────────────────────────────────────────────────

export async function fetchProfile(address: string): Promise<Profile> {
  const r = await get<{ data: Profile }>(`/api/profile/${address}`);
  return r.data;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

async function adminPost(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(ADMIN_KEY) },
    body:    body ? JSON.stringify(body) : undefined,
    cache:   "no-store",
  });
  if (!res.ok) throw new Error(`Admin API error ${res.status}: ${path}`);
}

export async function fetchAdminTokens(params?: {
  page?: number; limit?: number; hidden?: boolean; flagged?: boolean; featured?: boolean;
}): Promise<PagedResult<Token & { hidden: boolean; flagReason: string | null; featuredAt: string | null }>> {
  const qs = new URLSearchParams();
  if (params?.page)    qs.set("page",     String(params.page));
  if (params?.limit)   qs.set("limit",    String(params.limit));
  if (params?.hidden)  qs.set("hidden",   "true");
  if (params?.flagged) qs.set("flagged",  "true");
  if (params?.featured)qs.set("featured", "true");
  const res = await fetch(`${BASE}/api/admin/tokens?${qs}`, {
    headers: adminHeaders(ADMIN_KEY),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error("Admin token fetch failed");
  return res.json() as Promise<PagedResult<Token & { hidden: boolean; flagReason: string | null; featuredAt: string | null }>>;
}

export const adminToken = {
  hide:      (addr: string) => adminPost(`/api/admin/tokens/${addr}/hide`),
  unhide:    (addr: string) => adminPost(`/api/admin/tokens/${addr}/unhide`),
  feature:   (addr: string) => adminPost(`/api/admin/tokens/${addr}/feature`),
  unfeature: (addr: string) => adminPost(`/api/admin/tokens/${addr}/unfeature`),
  flag:      (addr: string, reason?: string) => adminPost(`/api/admin/tokens/${addr}/flag`, { reason }),
  unflag:    (addr: string) => adminPost(`/api/admin/tokens/${addr}/unflag`),
};

export async function fetchBlocklist(): Promise<BlockedWallet[]> {
  const res = await fetch(`${BASE}/api/admin/blocklist`, {
    headers: adminHeaders(ADMIN_KEY),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error("Blocklist fetch failed");
  const r = await res.json() as { data: BlockedWallet[] };
  return r.data;
}

export async function addToBlocklist(
  address: string, reason?: string
): Promise<BlockedWallet> {
  const res = await fetch(`${BASE}/api/admin/blocklist`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...adminHeaders(ADMIN_KEY) },
    body:    JSON.stringify({ address, reason }),
    cache:   "no-store",
  });
  if (!res.ok) throw new Error("Blocklist add failed");
  const r = await res.json() as { data: BlockedWallet };
  return r.data;
}

export async function removeFromBlocklist(address: string): Promise<void> {
  await del(`/api/admin/blocklist/${address}`, ADMIN_KEY);
}