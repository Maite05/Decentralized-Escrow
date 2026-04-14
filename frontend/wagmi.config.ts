import { createConfig, http } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import { metaMask, walletConnect, coinbaseWallet } from "wagmi/connectors";
import type { Chain } from "viem";

// X Layer mainnet (Chain ID 196) — OKX's EVM-compatible L2
const xlayer = {
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

// X Layer testnet (Chain ID 1952)
const xlayerTestnet = {
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

// Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env to enable WalletConnect.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [xlayer, xlayerTestnet, polygon, polygonMumbai],
  connectors: [
    metaMask(),
    walletConnect({ projectId: walletConnectProjectId }),
    coinbaseWallet({ appName: "Decentralized Escrow" }),
  ],
  transports: {
    // Set NEXT_PUBLIC_XLAYER_RPC_URL in .env to use a private RPC (defaults to public).
    [xlayer.id]: http(process.env.NEXT_PUBLIC_XLAYER_RPC_URL ?? "https://rpc.xlayer.tech"),
    [xlayerTestnet.id]: http("https://testrpc.xlayer.tech"),
    // Set NEXT_PUBLIC_POLYGON_RPC_URL / NEXT_PUBLIC_MUMBAI_RPC_URL for private RPCs.
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [polygonMumbai.id]: http(process.env.NEXT_PUBLIC_MUMBAI_RPC_URL),
  },
});
