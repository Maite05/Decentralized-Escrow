import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";
import { useProjectsByClient, useProjectsByFreelancer } from "../hooks/useEscrow";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const Dashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const connectedAddress = address ?? ZERO_ADDRESS;

  const { data: clientProjects } = useProjectsByClient(connectedAddress);
  const { data: freelancerProjects } = useProjectsByFreelancer(connectedAddress);

  const clientList = (clientProjects ?? []) as `0x${string}`[];
  const freelancerList = (freelancerProjects ?? []) as `0x${string}`[];

  const allProjects = [
    ...new Set([...clientList, ...freelancerList]),
  ] as `0x${string}`[];

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Decentralized Escrow
        </h1>
        <WalletButton />
      </header>

      {!isConnected ? (
        <p className="text-gray-500 text-center py-16">
          Connect your wallet to view your escrows.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Escrows
            </h2>
            <Link
              href="/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + New Escrow
            </Link>
          </div>

          {allProjects.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">
              No escrows found. Create one to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {allProjects.map(addr => (
                <li key={addr}>
                  <Link
                    href={`/escrow/${addr}`}
                    className="flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-mono text-sm text-gray-700">
                      {addr}
                    </span>
                    <span className="text-xs text-gray-400">View →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
};

export default Dashboard;
