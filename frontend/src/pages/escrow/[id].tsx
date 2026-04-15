import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navbar } from "../../components/Navbar";
import { MilestoneCard, type MilestoneData } from "../../components/MilestoneCard";
import { AddMilestoneForm } from "../../components/AddMilestoneForm";
import { TxLog } from "../../components/TxLog";
import { AIInsightPanel } from "../../components/AIInsightPanel";
import { useProject, useMilestone, useMilestoneCount } from "../../hooks/useEscrow";
import { useSocket } from "../../hooks/useSocket";
import { useAcceptEscrow, useEscrowProjects } from "../../hooks/useJobs";
import { calcFees, fmtUSDC, SEPOLIA_GAS_FEE_USD } from "../../lib/fees";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function MilestoneRow({
  escrowAddress, milestoneId, clientAddress, freelancerAddress, mediatorAddress, isLast, index,
}: {
  escrowAddress: `0x${string}`; milestoneId: bigint;
  clientAddress: `0x${string}`; freelancerAddress: `0x${string}`; mediatorAddress?: `0x${string}`;
  isLast: boolean; index: number;
}) {
  const { data, isLoading } = useMilestone(escrowAddress, milestoneId);

  if (isLoading || !data) {
    return (
      <div className="flex gap-4">
        <TimelineDot state={-1} index={index} isLast={isLast} />
        <div className="flex-1 pb-6"><div className="card p-5 animate-pulse h-24" /></div>
      </div>
    );
  }

  const [id, amount, state, deliveredAt, description] = data as [bigint, bigint, number, bigint, string];
  const milestone: MilestoneData = { id, amount, state, deliveredAt, description };

  return (
    <div className="flex gap-4">
      <TimelineDot state={state} index={index} isLast={isLast} />
      <div className="flex-1 pb-6">
        <MilestoneCard
          escrowAddress={escrowAddress}
          milestone={milestone}
          clientAddress={clientAddress}
          freelancerAddress={freelancerAddress}
          mediatorAddress={mediatorAddress}
        />
      </div>
    </div>
  );
}

function TimelineDot({ state, index, isLast }: { state: number; index: number; isLast: boolean }) {
  const released  = state === 2;
  const delivered = state === 1;
  const disputed  = state === 3;

  const dotCls = released
    ? "bg-emerald-500 border-emerald-500"
    : delivered ? "bg-indigo-600 border-indigo-600"
    : disputed  ? "bg-red-500 border-red-500"
    : "bg-white border-slate-300";

  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${dotCls}`}>
        {released ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : disputed ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        ) : (
          <span className="text-xs font-bold text-slate-500">{index + 1}</span>
        )}
      </div>
      {!isLast && <div className="w-0.5 flex-1 mt-1 min-h-12 bg-slate-200" />}
    </div>
  );
}

function StatCard({ label, value, sub, mono = false, href }: {
  label: string; value: string; sub?: string; mono?: boolean; href?: string;
}) {
  const inner = (
    <div className="card p-4 space-y-1">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 truncate ${mono ? "font-mono" : ""} ${href ? "text-indigo-600 hover:underline" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : inner;
}

function FeeSummaryPanel({
  totalAmount,
  milestoneCount,
  escrowAddress,
}: {
  totalAmount: number;
  milestoneCount: number;
  escrowAddress: string;
}) {
  const fees = calcFees(totalAmount);
  const gasTotal = milestoneCount * SEPOLIA_GAS_FEE_USD;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <h3 className="font-semibold text-amber-900 text-sm">Fee Summary</h3>
        <a
          href={`https://sepolia.etherscan.io/address/${escrowAddress}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-indigo-600 hover:underline font-mono"
        >
          View on Etherscan
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <FeeStatCell label="Contract Value" value={`$${fmtUSDC(fees.grossAmount)}`} />
        <FeeStatCell label="Client Pays (incl. 8%)" value={`$${fmtUSDC(fees.clientPays)}`} warn />
        <FeeStatCell label="Platform Fee (8%)" value={`$${fmtUSDC(fees.platformFee)}`} warn />
        <FeeStatCell label="Gas per Milestone" value={`$${fmtUSDC(SEPOLIA_GAS_FEE_USD)}`} warn />
        <FeeStatCell label={`Total Gas (${milestoneCount} ms)`} value={`$${fmtUSDC(gasTotal)}`} warn />
        <FeeStatCell label="Freelancer Net" value={`$${fmtUSDC(Math.max(0, fees.netPayout - (gasTotal - SEPOLIA_GAS_FEE_USD)))}`} positive />
      </div>
    </div>
  );
}

function FeeStatCell({ label, value, warn, positive }: { label: string; value: string; warn?: boolean; positive?: boolean }) {
  return (
    <div className="bg-white/60 rounded-lg px-3 py-2 space-y-0.5">
      <p className="text-xs text-amber-700">{label}</p>
      <p className={`text-sm font-semibold font-mono tabular-nums ${positive ? "text-emerald-700" : warn ? "text-amber-900" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: "Client" | "Freelancer" | "Mediator" }) {
  const cls =
    role === "Client"    ? "badge-blue"   :
    role === "Freelancer"? "badge-green"  : "badge-purple";
  return <span className={`badge ${cls}`}>{role}</span>;
}

const EscrowDetail: NextPage = () => {
  const router        = useRouter();
  const escrowAddress = (router.query.id as `0x${string}`) ?? ZERO_ADDR;
  const { address: connectedWallet } = useActiveAddress();
  const queryClient   = useQueryClient();

  const { data: projectData, isLoading: projectLoading } = useProject(escrowAddress);
  const { data: countData }                              = useMilestoneCount(escrowAddress);

  const [, client, freelancer, mediator, totalAmount] = (projectData as
    | [bigint, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]
    | undefined) ?? [0n, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, 0n, 0n];

  const milestoneCount = Number(countData ?? 0n);
  const isClient       = connectedWallet?.toLowerCase() === client.toLowerCase()     && client     !== ZERO_ADDR;
  const isFreelancer   = connectedWallet?.toLowerCase() === freelancer.toLowerCase() && freelancer !== ZERO_ADDR;
  const isMediator     = connectedWallet?.toLowerCase() === mediator?.toLowerCase()  && mediator   !== ZERO_ADDR;
  const role = isClient ? "Client" : isFreelancer ? "Freelancer" : isMediator ? "Mediator" : null;

  const budgetFormatted = totalAmount
    ? (Number(totalAmount) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2 })
    : "—";

  // Backend project record (for freelancerAccepted flag)
  const { data: projectsData } = useEscrowProjects(connectedWallet);
  const backendProject = projectsData?.projects?.find(
    (p) => p.escrowAddress.toLowerCase() === escrowAddress.toLowerCase()
  );
  const freelancerAccepted = backendProject?.freelancerAccepted ?? true; // default true if not found
  const { mutate: acceptEscrow, isPending: isAccepting } = useAcceptEscrow();
  const [accepted, setAccepted] = useState(false);
  const showAcceptBanner = isFreelancer && !freelancerAccepted && !accepted;

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

        {/* Header */}
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {role && <RoleBadge role={role} />}
                {connected && (
                  <span className="flex items-center gap-1 badge badge-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="font-mono text-sm text-slate-500 break-all">{escrowAddress}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(escrowAddress)}
              className="btn-outline text-xs shrink-0"
            >
              Copy
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Budget"     value={`${budgetFormatted} USDC`} />
            <StatCard label="Milestones" value={projectLoading ? "…" : milestoneCount.toString()} />
            <StatCard
              label="Client"
              value={client === ZERO_ADDR ? "…" : shorten(client)}
              mono
              href={client !== ZERO_ADDR ? `https://sepolia.etherscan.io/address/${client}` : undefined}
            />
            <StatCard
              label="Freelancer"
              value={freelancer === ZERO_ADDR ? "…" : shorten(freelancer)}
              mono
              href={freelancer !== ZERO_ADDR ? `https://sepolia.etherscan.io/address/${freelancer}` : undefined}
            />
          </div>
        </div>

        {/* Freelancer acceptance banner */}
        {showAcceptBanner && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-900">Accept this escrow to begin work</p>
              <p className="text-sm text-amber-700 mt-0.5">
                The client has funded the escrow. Review the milestones below, then confirm you accept the project terms and are ready to start.
              </p>
              <button
                type="button"
                disabled={isAccepting}
                onClick={() => {
                  if (!connectedWallet) return;
                  acceptEscrow(
                    { escrowAddress, freelancerWallet: connectedWallet },
                    { onSuccess: () => setAccepted(true) }
                  );
                }}
                className="mt-3 btn-primary text-sm"
              >
                {isAccepting ? "Confirming…" : "Accept & Start Project"}
              </button>
            </div>
          </div>
        )}

        {/* Role guide */}
        {role && (
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
            role === "Client"    ? "bg-indigo-50  border-indigo-200  text-indigo-800"  :
            role === "Mediator"  ? "bg-purple-50  border-purple-200  text-purple-800"  :
                                   "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
            <svg className="w-4 h-4 mt-0.5 shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {role === "Client"
              ? "As client, you can add milestones, approve delivered work, and release USDC payments."
              : role === "Mediator"
              ? "As mediator, you can release funds to the freelancer or refund the client when a dispute is open."
              : "As freelancer, mark milestones delivered once complete. USDC releases after client approval."}
          </div>
        )}

        {/* Fee Summary Panel */}
        {totalAmount > 0n && (
          <FeeSummaryPanel
            totalAmount={Number(totalAmount) / 1e6}
            milestoneCount={milestoneCount}
            escrowAddress={escrowAddress}
          />
        )}

        {/* AI Insight */}
        <AIInsightPanel projectId={escrowAddress} />

        {/* Milestones */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            Milestone Timeline
            {milestoneCount > 0 && (
              <span className="text-xs font-normal text-slate-400">({milestoneCount} total)</span>
            )}
          </h2>
          {milestoneCount === 0 && !isClient ? (
            <div className="card p-8 text-center space-y-2">
              <p className="text-slate-500 text-sm">No milestones added yet.</p>
              <p className="text-xs text-slate-400">The client will define deliverables and amounts.</p>
            </div>
          ) : (
            <div>
              {Array.from({ length: milestoneCount }, (_, i) => BigInt(i)).map((id, i) => (
                <MilestoneRow
                  key={id.toString()}
                  escrowAddress={escrowAddress}
                  milestoneId={id}
                  clientAddress={client}
                  freelancerAddress={freelancer}
                  mediatorAddress={mediator !== ZERO_ADDR ? mediator : undefined}
                  isLast={i === milestoneCount - 1 && !isClient}
                  index={i}
                />
              ))}
              {isClient && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 pb-4">
                    <AddMilestoneForm escrowAddress={escrowAddress} nextIndex={milestoneCount} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Transaction log */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Transaction Log</h2>
          <div className="card p-4">
            <TxLog escrowAddress={escrowAddress} />
          </div>
        </section>

      </main>
    </>
  );
};

export default EscrowDetail;
