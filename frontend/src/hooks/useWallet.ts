import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

// X Layer mainnet (196) / testnet (1952) — keep in sync with wagmi.config.ts.
const xlayer: Chain = {
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
};

const xlayerTestnet: Chain = {
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
};

// NEXT_PUBLIC_TARGET_CHAIN_ID controls which chain the app targets.
//   196    → X Layer mainnet
//   1952   → X Layer testnet
//   137    → Polygon mainnet
//   80001  → Polygon Mumbai (default)
const TARGET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_TARGET_CHAIN_ID ?? "1952",
  10
);

const CHAIN_MAP: Record<number, Chain> = {
  196: xlayer,
  1952: xlayerTestnet,
  137: polygon,
  80001: polygonMumbai,
};

export const TARGET_CHAIN: Chain =
  CHAIN_MAP[TARGET_CHAIN_ID] ?? xlayerTestnet;

export function useWallet() {
  const { address, isConnected, chainId, status } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongChain = isConnected && chainId !== TARGET_CHAIN.id;

  return {
    address,
    isConnected,
    chainId,
    status,
    connect,
    connectors,
    isConnecting,
    disconnect,
    switchChain,
    isSwitching,
    isWrongChain,
    TARGET_CHAIN,
  };
}
