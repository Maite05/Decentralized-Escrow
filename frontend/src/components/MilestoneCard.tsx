import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { syncMilestoneAction, syncDisputeRaised } from "../lib/backendSync";
import { FeeBreakdown } from "./FeeBreakdown";

// 0=LOCKED 1=DELIVERED 2=RELEASED 3=DISPUTED 4=REFUNDED
const STATE_LABELS = ["Locked", "Delivered", "Released", "Disputed", "Refunded"] as const;

const STATE_BADGE: Record<number, string> = {
  0: "badge-yellow",
  1: "badge-blue",
  2: "badge-green",
  3: "badge-red",
  4: "badge-gray",
};

const TIMELINE_STEPS = ["Funded", "In Progress", "Awaiting Approval", "Released"] as const;

export interface MilestoneData {
  id: bigint;
  amount: bigint;
  state: number;
  deliveredAt: bigint;
  description: string;
  clientApproved?: boolean;
  freelancerDelivered?: boolean;
  dueDate?: string; // ISO string from backend
}

interface Props {
  escrowAddress: `0x${string}`;
  milestone: MilestoneData;
  clientAddress: `0x${string}`;
  freelancerAddress: `0x${string}`;
  mediatorAddress?: `0x${string}`;
}

function stateToStep(state: number): number {
  if (state === 0) return 1;
  if (state === 1 || state === 3) return 2;
  if (state === 2) return 3;
  return 1;
}

export function MilestoneCard({
  escrowAddress,
  milestone,
  clientAddress,
  freelancerAddress,
  mediatorAddress,
}: Props) {
  const { address } = useAccount();
  const { markDelivered, approveMilestone, raiseDispute, resolveDispute, isPending, isConfirming, isConfirmed } =
    useEscrowWrite(escrowAddress);

  const pendingAction = useRef<"deliver" | "approve" | "dispute" | "resolve_freelancer" | "resolve_client" | null>(null);
  const isClient     = address?.toLowerCase() === clientAddress.toLowerCase();
  const isFreelancer = address?.toLowerCase() === freelancerAddress.toLowerCase();
  const isMediator   = mediatorAddress && address?.toLowerCase() === mediatorAddress.toLowerCase();
  const isBusy       = isPending || isConfirming;

  const stateLabel = STATE_LABELS[milestone.state] ?? "Unknown";
  const badgeClass = STATE_BADGE[milestone.state] ?? "badge-gray";
  const amountUSDC = (Number(milestone.amount) / 1e6).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const activeStep          = stateToStep(milestone.state);
  const clientApproved      = milestone.clientApproved      ?? (milestone.state === 2);
  const freelancerDelivered = milestone.freelancerDelivered ?? (milestone.state >= 1);

  useEffect(() => {
    if (!isConfirmed || !pendingAction.current || !address) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action === "dispute") {
      syncDisputeRaised(escrowAddress, Number(milestone.id), address)
        .catch((err) => console.warn("[MilestoneCard] dispute sync failed:", err));
    } else if (action === "deliver" || action === "approve") {
      syncMilestoneAction(escrowAddress, Number(milestone.id), address, action)
        .catch((err) => console.warn("[MilestoneCard] milestone sync failed:", err));
    }
  }, [isConfirmed, escrowAddress, milestone.id, address]);

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">#{Number(milestone.id) + 1}</span>
            <p className="font-medium text-slate-800 text-sm">{milestone.description}</p>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center flex-wrap gap-x-2">
            <span className="font-semibold text-slate-700">{amountUSDC} USDC</span>
            {milestone.state === 2 && milestone.deliveredAt > 0n && (
              <span className="text-slate-400">
                · released {new Date(Number(milestone.deliveredAt) * 1000).toLocaleDateString()}
              </span>
            )}
            {milestone.dueDate && milestone.state < 2 && (() => {
              const due = new Date(milestone.dueDate);
              const now = new Date();
              const overdue = due < now;
              return (
                <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? "text-red-500" : "text-slate-400"}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {overdue ? "Overdue · " : "Due "}{due.toLocaleDateString()}
                </span>
              );
            })()}
          </p>
        </div>
        <span className={`badge ${badgeClass} shrink-0`}>{stateLabel}</span>
      </div>

      {/* Timeline steps */}
      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const done    = i < activeStep;
          const current = i === activeStep - 1;
          const isLast  = i === TIMELINE_STEPS.length - 1;
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                  ${done || current
                    ? milestone.state === 3
                      ? "bg-red-500 border-red-500"
                      : "bg-indigo-600 border-indigo-600"
                    : "bg-white border-slate-300"}`}
                >
                  {done && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] mt-1 text-center leading-tight max-w-[56px]
                  ${done || current ? "text-slate-600" : "text-slate-400"}`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={`h-0.5 flex-1 mx-1 transition-colors
                  ${done ? "bg-indigo-400" : "bg-slate-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Dual approval indicators */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${freelancerDelivered ? "bg-emerald-500" : "bg-slate-200"}`} />
          <span className={freelancerDelivered ? "text-emerald-600" : "text-slate-400"}>
            Freelancer delivered
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${clientApproved ? "bg-indigo-500" : "bg-slate-200"}`} />
          <span className={clientApproved ? "text-indigo-600" : "text-slate-400"}>
            Client approved
          </span>
        </div>
      </div>

      {/* Fee breakdown — freelancer sees their net payout; client sees net note on delivered */}
      {isFreelancer && milestone.state < 2 && (
        <FeeBreakdown amount={amountUSDC} mode="freelancer" collapsed />
      )}
      {isClient && milestone.state === 1 && (
        <FeeBreakdown amount={amountUSDC} mode="client" collapsed />
      )}
      {milestone.state === 2 && (
        <FeeBreakdown amount={amountUSDC} mode="freelancer" collapsed={false} />
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {isFreelancer && milestone.state === 0 && (
          <button type="button"
            onClick={() => { pendingAction.current = "deliver"; markDelivered(milestone.id); }}
            disabled={isBusy}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {isBusy ? <><Spinner /> Waiting…</> : "Mark as Delivered"}
          </button>
        )}
        {isClient && milestone.state === 1 && (
          <button type="button"
            onClick={() => { pendingAction.current = "approve"; approveMilestone(milestone.id); }}
            disabled={isBusy}
            className="btn-success text-xs py-1.5 px-3"
          >
            {isBusy ? <><Spinner /> Waiting…</> : "Approve & Release USDC"}
          </button>
        )}
        {(isClient || isFreelancer) && (milestone.state === 0 || milestone.state === 1) && (
          <button type="button"
            onClick={() => { pendingAction.current = "dispute"; raiseDispute(milestone.id); }}
            disabled={isBusy}
            className="btn-danger text-xs py-1.5 px-3"
          >
            {isBusy ? <><Spinner /> Waiting…</> : "Raise Dispute"}
          </button>
        )}
        {isMediator && milestone.state === 3 && (
          <>
            <button type="button"
              onClick={() => { pendingAction.current = "resolve_freelancer"; resolveDispute?.(milestone.id, true); }}
              disabled={isBusy}
              className="btn-success text-xs py-1.5 px-3"
            >
              {isBusy ? <><Spinner /> Waiting…</> : "Release to Freelancer"}
            </button>
            <button type="button"
              onClick={() => { pendingAction.current = "resolve_client"; resolveDispute?.(milestone.id, false); }}
              disabled={isBusy}
              className="btn-danger text-xs py-1.5 px-3"
            >
              {isBusy ? <><Spinner /> Waiting…</> : "Refund Client"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
