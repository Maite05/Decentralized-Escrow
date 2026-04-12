import { useWatchContractEvent } from "wagmi";
import { useState } from "react";
import { ESCROW_ABI } from "../lib/constants";

export type EscrowEventType = "Released" | "DisputeRaised";

export interface EscrowEvent {
  type: EscrowEventType;
  args: Record<string, unknown>;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
}

/**
 * Subscribes to Released and DisputeRaised events on the given escrow address.
 * New events are prepended so the list is always newest-first.
 */
export function useEscrowEvents(escrowAddress: `0x${string}`) {
  const [events, setEvents] = useState<EscrowEvent[]>([]);

  useWatchContractEvent({
    address: escrowAddress,
    abi: ESCROW_ABI,
    eventName: "Released",
    onLogs(logs) {
      setEvents(prev => [
        ...logs.map(log => ({
          type: "Released" as const,
          args: log.args as Record<string, unknown>,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        })),
        ...prev,
      ]);
    },
  });

  useWatchContractEvent({
    address: escrowAddress,
    abi: ESCROW_ABI,
    eventName: "DisputeRaised",
    onLogs(logs) {
      setEvents(prev => [
        ...logs.map(log => ({
          type: "DisputeRaised" as const,
          args: log.args as Record<string, unknown>,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        })),
        ...prev,
      ]);
    },
  });

  return { events };
}
