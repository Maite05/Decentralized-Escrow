import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { ProjectCard } from "../components/ProjectCard";
import { useProjectsByClient, useProjectsByFreelancer } from "../hooks/useEscrow";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const Dashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const connectedAddress = address ?? ZERO_ADDRESS;

  const { data: clientProjects, isLoading: clientLoading } =
    useProjectsByClient(connectedAddress);
  const { data: freelancerProjects, isLoading: freelancerLoading } =
    useProjectsByFreelancer(connectedAddress);

  const clientList = (clientProjects ?? []) as `0x${string}`[];
  const freelancerList = (freelancerProjects ?? []) as `0x${string}`[];
  const allProjects = [...new Set([...clientList, ...freelancerList])] as `0x${string}`[];
  const isLoading = clientLoading || freelancerLoading;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {!isConnected ? (
          <EmptyConnectState />
        ) : (
          <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Escrows</h1>
                {!isLoading && allProjects.length > 0 && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {allProjects.length} active {allProjects.length === 1 ? "project" : "projects"}
                  </p>
                )}
              </div>
              <Link href="/create" className="btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Escrow
              </Link>
            </div>

            {/* Project list */}
            {isLoading ? (
              <LoadingSkeleton />
            ) : allProjects.length === 0 ? (
              <EmptyProjectState />
            ) : (
              <div className="space-y-3">
                {allProjects.map((addr) => (
                  <ProjectCard key={addr} escrowAddress={addr} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

function EmptyConnectState() {
  return (
    <div className="text-center py-24 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">Secure freelance payments</h2>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">
          Milestone-based escrow on X Layer. Funds are locked on-chain and released only when work is approved.
        </p>
      </div>
      <p className="text-sm text-slate-400">Connect your wallet to get started</p>
    </div>
  );
}

function EmptyProjectState() {
  return (
    <div className="card p-10 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-700">No escrows yet</p>
        <p className="text-sm text-slate-400 mt-1">
          Create your first escrow to start working with a client or freelancer.
        </p>
      </div>
      <Link href="/create" className="btn-primary inline-flex">
        Create your first escrow
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
