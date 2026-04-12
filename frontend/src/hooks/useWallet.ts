import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

// TODO: set NEXT_PUBLIC_TARGET_CHAIN_ID in .env (137 = Polygon, 80001 = Mumbai)
const TARGET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_TARGET_CHAIN_ID ?? "80001",
  10
);

export const TARGET_CHAIN: Chain =
  TARGET_CHAIN_ID === polygon.id ? polygon : polygonMumbai;

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
