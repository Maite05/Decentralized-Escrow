import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { syncMilestoneAction, syncDisputeRaised } from "../lib/backendSync";

const STATE_LABELS = ["Locked", "Delivered", "Released", "Disputed", "Refunded"] as const;

const STATE_STYLE: Record<number, string> = {
  0: "badge-yellow",
  1: "badge-blue",
  2: "badge-green",
  3: "badge-red",
  4: "badge-gray",
};

export interface MilestoneData {
  id: bigint;
  amount: bigint;
  state: number;
  deliveredAt: bigint;
  description: string;
}

interface Props {
  escrowAddress: `0x${string}`;
  milestone: MilestoneData;
  clientAddress: `0x${string}`;
  freelancerAddress: `0x${string}`;
}

export function MilestoneCard({ escrowAddress, milestone, clientAddress, freelancerAddress }: Props) {
  const { address } = useAccount();
  const { markDelivered, approveMilestone, raiseDispute, isPending, isConfirming, isConfirmed } =
    useEscrowWrite(escrowAddress);

  const pendingAction = useRef<"deliver" | "approve" | "dispute" | null>(null);
  const isClient = address?.toLowerCase() === clientAddress.toLowerCase();
  const isFreelancer = address?.toLowerCase() === freelancerAddress.toLowerCase();
  const isBusy = isPending || isConfirming;
  const stateLabel = STATE_LABELS[milestone.state] ?? "Unknown";
  const badgeClass = STATE_STYLE[milestone.state] ?? "badge-gray";
  const amountFormatted = (Number(milestone.amount) / 1e18).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  useEffect(() => {
    if (!isConfirmed || !pendingAction.current || !address) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action === "dispute") {
      syncDisputeRaised(escrowAddress, Number(milestone.id), address)
        .catch((err) => console.warn("[MilestoneCard] dispute sync failed:", err));
    } else {
      syncMilestoneAction(escrowAddress, Number(milestone.id), address, action)
        .catch((err) => console.warn("[MilestoneCard] milestone sync failed:", err));
    }
  }, [isConfirmed, escrowAddress, milestone.id, address]);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">
              #{Number(milestone.id) + 1}
            </span>
            <p className="font-medium text-slate-900">{milestone.description}</p>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            <span className="font-semibold text-slate-800">{amountFormatted}</span> tokens
            {milestone.state === 2 && milestone.deliveredAt > 0n && (
              <span className="ml-2 text-slate-400">
                · released {new Date(Number(milestone.deliveredAt) * 1000).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <span className={`badge ${badgeClass} shrink-0`}>{stateLabel}</span>
      </div>

      {/* Progress track */}
      <div className="flex gap-1">
        {[0, 1, 2].map((stage) => (
          <div key={stage} className={`h-1 flex-1 rounded-full transition-colors
            ${milestone.state >= stage + 1 ? "bg-emerald-400" : "bg-slate-100"}`}
          />
        ))}
      </div>

      {/* Action buttons */}
      {(isClient || isFreelancer) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {isFreelancer && milestone.state === 0 && (
            <button type="button"
              onClick={() => { pendingAction.current = "deliver"; markDelivered(milestone.id); }}
              disabled={isBusy}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {isBusy ? <><Spinner /> Waiting…</> : "Mark Delivered"}
            </button>
          )}
          {isClient && milestone.state === 1 && (
            <button type="button"
              onClick={() => { pendingAction.current = "approve"; approveMilestone(milestone.id); }}
              disabled={isBusy}
              className="btn-success text-xs py-1.5 px-3"
            >
              {isBusy ? <><Spinner /> Waiting…</> : "Approve & Release"}
            </button>
          )}
          {(milestone.state === 0 || milestone.state === 1) && (
            <button type="button"
              onClick={() => { pendingAction.current = "dispute"; raiseDispute(milestone.id); }}
              disabled={isBusy}
              className="btn-danger text-xs py-1.5 px-3"
            >
              {isBusy ? <><Spinner /> Waiting…</> : "Raise Dispute"}
            </button>
          )}
        </div>
      )}
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
