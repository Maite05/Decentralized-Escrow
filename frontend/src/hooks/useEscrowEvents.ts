import { useWatchContractEvent } from "wagmi";
import { useState } from "react";
import { ESCROW_ABI } from "../lib/constants";
import type { Log } from "viem";

export type EscrowEventType = "Released" | "DisputeRaised";

export interface EscrowEvent {
  type:            EscrowEventType;
  args:            Record<string, unknown>;
  blockNumber:     bigint | null;
  transactionHash: `0x${string}` | null;
}

// Viem's watched logs include decoded args but the generic Log type doesn't
// expose them — cast to this shape so we stay type-safe without losing data.
type DecodedLog = Log & { args?: Record<string, unknown> };

function toEvent(type: EscrowEventType, log: DecodedLog): EscrowEvent {
  return {
    type,
    args:            log.args ?? {},
    blockNumber:     log.blockNumber,
    transactionHash: log.transactionHash,
  };
}

/**
 * Subscribes to Released and DisputeRaised events on the given escrow address.
 * New events are prepended so the list is always newest-first.
 */
export function useEscrowEvents(escrowAddress: `0x${string}`) {
  const [events, setEvents] = useState<EscrowEvent[]>([]);

  useWatchContractEvent({
    address:   escrowAddress,
    abi:       ESCROW_ABI,
    eventName: "Released",
    onLogs(logs) {
      setEvents(prev => [
        ...(logs as DecodedLog[]).map(l => toEvent("Released", l)),
        ...prev,
      ]);
    },
  });

  useWatchContractEvent({
    address:   escrowAddress,
    abi:       ESCROW_ABI,
    eventName: "DisputeRaised",
    onLogs(logs) {
      setEvents(prev => [
        ...(logs as DecodedLog[]).map(l => toEvent("DisputeRaised", l)),
        ...prev,
      ]);
    },
  });

  return { events };
}
