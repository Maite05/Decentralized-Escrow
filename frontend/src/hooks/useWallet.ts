import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import type { Chain } from "wagmi/chains";
// Import chain definitions from the single source of truth.
import { xlayer, xlayerTestnet } from "../../wagmi.config";

// NEXT_PUBLIC_TARGET_CHAIN_ID controls which chain the app targets.
//   1952   → X Layer testnet  (default — used for the hackathon demo)
//   196    → X Layer mainnet
//   137    → Polygon mainnet
//   80001  → Polygon Mumbai
const TARGET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_TARGET_CHAIN_ID ?? "1952",
  10
);

const CHAIN_MAP: Record<number, Chain> = {
  196:   xlayer,
  1952:  xlayerTestnet,
  137:   polygon,
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
