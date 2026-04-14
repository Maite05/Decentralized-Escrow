import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { syncMilestoneAction } from "../lib/backendSync";

/** Mirror of the Solidity State enum (0-indexed). */
const STATE_LABELS = [
  "Locked",
  "Delivered",
  "Released",
  "Disputed",
  "Refunded",
] as const;

const STATE_COLOURS: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-800",
  1: "bg-blue-100 text-blue-800",
  2: "bg-green-100 text-green-800",
  3: "bg-red-100 text-red-800",
  4: "bg-gray-100 text-gray-600",
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

export function MilestoneCard({
  escrowAddress,
  milestone,
  clientAddress,
  freelancerAddress,
}: Props) {
  const { address } = useAccount();
  const { markDelivered, approveMilestone, raiseDispute, isPending, isConfirming, isConfirmed } =
    useEscrowWrite(escrowAddress);

  // Track which action was last triggered so we know what to sync on confirmation
  const pendingAction = useRef<"deliver" | "approve" | null>(null);

  const isClient = address?.toLowerCase() === clientAddress.toLowerCase();
  const isFreelancer = address?.toLowerCase() === freelancerAddress.toLowerCase();

  const isBusy = isPending || isConfirming;
  const stateLabel = STATE_LABELS[milestone.state] ?? "Unknown";
  const stateColour = STATE_COLOURS[milestone.state] ?? "bg-gray-100 text-gray-600";
  const amountFormatted = (Number(milestone.amount) / 1e18).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  // After on-chain confirmation, mirror the state change to the off-chain DB
  useEffect(() => {
    if (!isConfirmed || !pendingAction.current || !address) return;
    const action = pendingAction.current;
    pendingAction.current = null;

    syncMilestoneAction(
      escrowAddress,
      Number(milestone.id),
      address,
      action
    ).catch((err) =>
      console.warn("[MilestoneCard] backend sync failed:", err)
    );
  }, [isConfirmed, escrowAddress, milestone.id, address]);

  const handleMarkDelivered = () => {
    pendingAction.current = "deliver";
    markDelivered(milestone.id);
  };

  const handleApprove = () => {
    pendingAction.current = "approve";
    approveMilestone(milestone.id);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white shadow-sm">
      <div className="flex justify-between items-start gap-2">
        <p className="font-medium text-gray-900 flex-1">{milestone.description}</p>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${stateColour}`}>
          {stateLabel}
        </span>
      </div>

      <p className="text-sm text-gray-500">
        Amount:{" "}
        <span className="font-semibold text-gray-800">{amountFormatted} tokens</span>
      </p>

      {milestone.state === 2 /* RELEASED */ && milestone.deliveredAt > 0n && (
        <p className="text-xs text-gray-400">
          Released on{" "}
          {new Date(Number(milestone.deliveredAt) * 1000).toLocaleDateString()}
        </p>
      )}

      {/* Action buttons — shown only to the relevant party in the right state */}
      <div className="flex flex-wrap gap-2 pt-1">
        {isFreelancer && milestone.state === 0 /* LOCKED */ && (
          <button
            onClick={handleMarkDelivered}
            disabled={isBusy}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isBusy ? "Waiting…" : "Mark Delivered"}
          </button>
        )}

        {isClient && milestone.state === 1 /* DELIVERED */ && (
          <button
            onClick={handleApprove}
            disabled={isBusy}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isBusy ? "Waiting…" : "Approve & Release"}
          </button>
        )}

        {(isClient || isFreelancer) &&
          (milestone.state === 0 || milestone.state === 1) && (
            <button
              onClick={() => raiseDispute(milestone.id)}
              disabled={isBusy}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isBusy ? "Waiting…" : "Raise Dispute"}
            </button>
          )}
      </div>
    </div>
  );
}
