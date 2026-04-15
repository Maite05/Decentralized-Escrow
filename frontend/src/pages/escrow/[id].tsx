import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navbar } from "../../components/Navbar";
import { MilestoneCard, type MilestoneData } from "../../components/MilestoneCard";
import { AddMilestoneForm } from "../../components/AddMilestoneForm";
import { TxLog } from "../../components/TxLog";
import { AIInsightPanel } from "../../components/AIInsightPanel";
import { useProject, useMilestone, useMilestoneCount } from "../../hooks/useEscrow";
import { useSocket } from "../../hooks/useSocket";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Milestone row (reads its own on-chain data) ───────────────────────────────
function MilestoneRow({
  escrowAddress, milestoneId, clientAddress, freelancerAddress,
}: {
  escrowAddress: `0x${string}`;
  milestoneId: bigint;
  clientAddress: `0x${string}`;
  freelancerAddress: `0x${string}`;
}) {
  const { data, isLoading } = useMilestone(escrowAddress, milestoneId);
  if (isLoading || !data) {
    return <div className="card p-5 animate-pulse h-24 bg-slate-50" />;
  }
  const [id, amount, state, deliveredAt, description] = data as [bigint, bigint, number, bigint, string];
  const milestone: MilestoneData = { id, amount, state, deliveredAt, description };
  return (
    <MilestoneCard
      escrowAddress={escrowAddress}
      milestone={milestone}
      clientAddress={clientAddress}
      freelancerAddress={freelancerAddress}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const EscrowDetail: NextPage = () => {
  const router = useRouter();
  const escrowAddress = (router.query.id as `0x${string}`) ?? ZERO_ADDR;
  const { address: connectedWallet } = useAccount();
  const queryClient = useQueryClient();

  const { data: projectData, isLoading: projectLoading } = useProject(escrowAddress);
  const { data: countData } = useMilestoneCount(escrowAddress);

  const [, client, freelancer, , totalAmount] = (projectData as
    | [bigint, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]
    | undefined) ?? [0n, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, 0n, 0n];

  const milestoneCount = Number(countData ?? 0n);
  const isClient = connectedWallet?.toLowerCase() === client.toLowerCase() && client !== ZERO_ADDR;

  // Real-time updates
  const { connected, milestoneEvent } = useSocket(router.isReady ? escrowAddress : null);
  useEffect(() => {
    if (!milestoneEvent) return;
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [milestoneEvent, queryClient]);

  if (!router.isReady) return null;

  return (
    <>
      <Navbar backHref="/" backLabel="Dashboard" />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Address + live badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-base font-semibold text-slate-800 break-all">
                {escrowAddress}
              </h1>
              {connected && (
                <span className="flex items-center gap-1 badge badge-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(escrowAddress)}
            className="btn-outline text-xs shrink-0"
          >
            Copy
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Budget"
            value={projectLoading ? "…" : `${(Number(totalAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens`}
          />
          <StatCard label="Milestones" value={projectLoading ? "…" : milestoneCount.toString()} />
          <StatCard label="Client" value={client === ZERO_ADDR ? "…" : shorten(client)} mono />
          <StatCard label="Freelancer" value={freelancer === ZERO_ADDR ? "…" : shorten(freelancer)} mono />
        </div>

        {/* AI Insight */}
        <AIInsightPanel projectId={escrowAddress} />

        {/* Milestones */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            Milestones
            {milestoneCount > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({milestoneCount})
              </span>
            )}
          </h2>
          <div className="space-y-3">
            {milestoneCount === 0 && !isClient ? (
              <p className="text-sm text-slate-400 italic">No milestones added yet.</p>
            ) : (
              Array.from({ length: milestoneCount }, (_, i) => BigInt(i)).map((id) => (
                <MilestoneRow
                  key={id.toString()}
                  escrowAddress={escrowAddress}
                  milestoneId={id}
                  clientAddress={client}
                  freelancerAddress={freelancer}
                />
              ))
            )}
            {isClient && (
              <AddMilestoneForm escrowAddress={escrowAddress} nextIndex={milestoneCount} />
            )}
          </div>
        </section>

        {/* Transaction log */}
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Transaction Log</h2>
          <div className="card p-4">
            <TxLog escrowAddress={escrowAddress} />
          </div>
        </section>

      </main>
    </>
  );
};

function StatCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="card p-3.5 space-y-1">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold text-slate-900 truncate ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default EscrowDetail;
