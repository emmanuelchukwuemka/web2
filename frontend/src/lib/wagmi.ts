import { createConfig, http } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

export const cronosTestnet = defineChain({
  id: 338,
  name: "Cronos Testnet",
  nativeCurrency: { name: "Test CRO", symbol: "TCRO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm-t3.cronos.org"] },
  },
  blockExplorers: {
    default: { name: "Cronoscan Testnet", url: "https://testnet.cronoscan.com" },
  },
  testnet: true,
});

export const cronos = defineChain({
  id: 25,
  name: "Cronos",
  nativeCurrency: { name: "CRO", symbol: "CRO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm.cronos.org"] },
  },
  blockExplorers: {
    default: { name: "Cronoscan", url: "https://cronoscan.com" },
  },
});

const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 338);
const chains = targetChainId === 25
  ? ([cronos] as const)
  : ([cronosTestnet] as const);

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const connectors = [
  injected(),
  metaMask(),
  ...(wcProjectId
    ? [walletConnect({ projectId: wcProjectId, showQrModal: true })]
    : []),
];

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [cronosTestnet.id]: http(),
    [cronos.id]:        http(),
  },
  ssr: true,
});

export const CHAIN = targetChainId === 25 ? cronos : cronosTestnet;