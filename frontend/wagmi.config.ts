import { createConfig, http } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import { walletConnect, coinbaseWallet, injected } from "wagmi/connectors";
import type { Chain } from "viem";

// ── X Layer mainnet (Chain ID 196) ────────────────────────────────────────────
export const xlayer = {
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_XLAYER_RPC_URL ?? "https://rpc.xlayer.tech",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: "https://www.okx.com/explorer/xlayer",
    },
  },
} as const satisfies Chain;

// ── X Layer testnet (Chain ID 1952) ───────────────────────────────────────────
export const xlayerTestnet = {
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech"] },
  },
  blockExplorers: {
    default: {
      name: "OKX Testnet Explorer",
      url: "https://www.okx.com/explorer/xlayer-test",
    },
  },
  testnet: true,
} as const satisfies Chain;

// ── WalletConnect project ID ───────────────────────────────────────────────────
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// ── Wagmi config ──────────────────────────────────────────────────────────────
export const wagmiConfig = createConfig({
  // Primary chains: X Layer mainnet + testnet.
  // Polygon chains are included so wagmi knows their RPC if a user's wallet is
  // already connected to them; the app will prompt to switch to X Layer.
  chains: [xlayerTestnet, xlayer, polygon, polygonMumbai],
  connectors: [
    // injected covers MetaMask, OKX Wallet, Rabby, and any browser extension.
    injected(),
    walletConnect({ projectId: walletConnectProjectId }),
    coinbaseWallet({ appName: "Decentralized Escrow" }),
  ],
  transports: {
    [xlayerTestnet.id]: http("https://testrpc.xlayer.tech"),
    [xlayer.id]:        http(process.env.NEXT_PUBLIC_XLAYER_RPC_URL ?? "https://rpc.xlayer.tech"),
    // Fallback public RPCs for Polygon so wagmi never gets undefined transports.
    [polygon.id]:       http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL      ?? "https://polygon-rpc.com"),
    [polygonMumbai.id]: http(process.env.NEXT_PUBLIC_MUMBAI_RPC_URL       ?? "https://rpc-mumbai.maticvigil.com"),
  },
});
