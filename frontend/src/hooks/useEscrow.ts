/**
 * Read hooks for MilestoneEscrow and EscrowFactory.
 *
 * NOTE: wagmi v2 renamed useContractRead → useReadContract and removed the
 * `watch` option. Live updates are achieved via `query.refetchInterval`.
 */
import { useReadContract } from "wagmi";
import { FACTORY_ADDRESS, FACTORY_ABI, ESCROW_ABI } from "../lib/constants";

const POLL_INTERVAL = 5_000; // ms

/** Fetches the Project struct from a deployed MilestoneEscrow. */
export function useProject(escrowAddress: `0x${string}`) {
  return useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: "project",
    query: { refetchInterval: POLL_INTERVAL },
  });
}

/** Fetches a single Milestone by id from a deployed MilestoneEscrow. */
export function useMilestone(
  escrowAddress: `0x${string}`,
  milestoneId: bigint
) {
  return useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: "getMilestone",
    args: [milestoneId],
    query: { refetchInterval: POLL_INTERVAL },
  });
}

/** Fetches the total number of milestones on an escrow. */
export function useMilestoneCount(escrowAddress: `0x${string}`) {
  return useReadContract({
    address: escrowAddress,
    abi: ESCROW_ABI,
    functionName: "getMilestoneCount",
    query: { refetchInterval: POLL_INTERVAL },
  });
}

/** Fetches all escrow addresses created by a client via the factory. */
export function useProjectsByClient(clientAddress: `0x${string}`) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getProjectsByClient",
    args: [clientAddress],
    query: { refetchInterval: POLL_INTERVAL },
  });
}

/** Fetches all escrow addresses where the given address is the freelancer. */
export function useProjectsByFreelancer(freelancerAddress: `0x${string}`) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getProjectsByFreelancer",
    args: [freelancerAddress],
    query: { refetchInterval: POLL_INTERVAL },
  });
}
