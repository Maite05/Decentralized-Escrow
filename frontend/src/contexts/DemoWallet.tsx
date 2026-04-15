import { createContext, useContext, useState, type ReactNode } from "react";

export type DemoRole = "CLIENT" | "FREELANCER" | "MEDIATOR";

export interface DemoWalletEntry {
  address: `0x${string}`;
  name: string;
  role: DemoRole;
  description: string;
  color: string; // Tailwind gradient classes for avatar
}

export const DEMO_WALLETS: DemoWalletEntry[] = [
  {
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    name: "Alice",
    role: "CLIENT",
    description: "Posts jobs, funds escrow, reviews work",
    color: "from-blue-400 to-indigo-600",
  },
  {
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    name: "Priya",
    role: "CLIENT",
    description: "Client with active disputed project",
    color: "from-violet-400 to-purple-600",
  },
  {
    address: "0x1234567890123456789012345678901234567890",
    name: "Bob",
    role: "FREELANCER",
    description: "Smart contract developer, DeFi specialist",
    color: "from-emerald-400 to-teal-600",
  },
  {
    address: "0xabcDEFabcDEFabcDEFabcDEFabcDEFabcDEFabcd",
    name: "Carol",
    role: "FREELANCER",
    description: "UI/UX designer & frontend developer",
    color: "from-pink-400 to-rose-600",
  },
  {
    address: "0xdEaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF",
    name: "Dave",
    role: "FREELANCER",
    description: "Full-stack Web3 engineer",
    color: "from-amber-400 to-orange-600",
  },
  {
    address: "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    name: "Elena",
    role: "FREELANCER",
    description: "Rust & Solana developer",
    color: "from-cyan-400 to-sky-600",
  },
  {
    address: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
    name: "Mediator",
    role: "MEDIATOR",
    description: "Resolves disputes between parties",
    color: "from-slate-400 to-slate-600",
  },
];

interface DemoWalletContextValue {
  demoWallet: DemoWalletEntry | null;
  setDemoWallet: (wallet: DemoWalletEntry | null) => void;
  isDemo: boolean;
}

const DemoWalletContext = createContext<DemoWalletContextValue>({
  demoWallet: null,
  setDemoWallet: () => {},
  isDemo: false,
});

export function DemoWalletProvider({ children }: { children: ReactNode }) {
  const [demoWallet, setDemoWallet] = useState<DemoWalletEntry | null>(null);

  return (
    <DemoWalletContext.Provider
      value={{
        demoWallet,
        setDemoWallet,
        isDemo: demoWallet !== null,
      }}
    >
      {children}
    </DemoWalletContext.Provider>
  );
}

export function useDemoWallet() {
  return useContext(DemoWalletContext);
}
