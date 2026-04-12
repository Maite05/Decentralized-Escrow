import { createConfig, http } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import { metaMask, walletConnect, coinbaseWallet } from "wagmi/connectors";

// TODO: set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [polygon, polygonMumbai],
  connectors: [
    metaMask(),
    walletConnect({ projectId: walletConnectProjectId }),
    coinbaseWallet({ appName: "Decentralized Escrow" }),
  ],
  transports: {
    // TODO: set NEXT_PUBLIC_POLYGON_RPC_URL in .env
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    // TODO: set NEXT_PUBLIC_MUMBAI_RPC_URL in .env
    [polygonMumbai.id]: http(process.env.NEXT_PUBLIC_MUMBAI_RPC_URL),
  },
});
