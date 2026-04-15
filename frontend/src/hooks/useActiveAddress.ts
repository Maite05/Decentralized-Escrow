import { useAccount } from "wagmi";
import { useDemoWallet } from "../contexts/DemoWallet";

/**
 * Returns the active wallet address, preferring the demo wallet over
 * a real wagmi connection. Use this everywhere you need the "current user"
 * address so that the demo mode drives all role-based UI.
 */
export function useActiveAddress(): {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isDemo: boolean;
  displayName?: string;
} {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { demoWallet, isDemo } = useDemoWallet();

  if (isDemo && demoWallet) {
    return {
      address: demoWallet.address.toLowerCase() as `0x${string}`,
      isConnected: true,
      isDemo: true,
      displayName: demoWallet.name,
    };
  }

  return {
    address: wagmiAddress,
    isConnected: wagmiConnected,
    isDemo: false,
  };
}
