import { post } from "./api";

/**
 * Register a newly deployed escrow in the off-chain DB.
 * Call this after the factory's createProject tx is confirmed.
 */
export async function registerProject(
  escrowAddress: string,
  clientWallet: string,
  freelancerWallet: string,
  totalAmount: string
): Promise<void> {
  await post("/escrow/projects", {
    escrowAddress,
    clientWallet,
    freelancerWallet,
    totalAmount,
  });
}

/**
 * Register a new milestone in the off-chain DB after it's added on-chain.
 */
export async function registerMilestone(
  escrowAddress: string,
  milestoneIndex: number,
  description: string,
  amount: string
): Promise<void> {
  await post(`/escrow/projects/${escrowAddress}/milestones`, {
    milestoneIndex,
    description,
    amount,
  });
}

/**
 * Notify the backend that a dispute was raised on-chain.
 */
export async function syncDisputeRaised(
  escrowAddress: string,
  milestoneIndex: number,
  raisedBy: string
): Promise<void> {
  await post("/escrow/disputes", {
    escrowAddress,
    milestoneIndex,
    raisedBy,
  });
}

/**
 * Sync a milestone state change to the off-chain DB.
 * Call this after markDelivered or approveMilestone is confirmed on-chain.
 *
 * @param escrowAddress - The deployed MilestoneEscrow contract address
 * @param milestoneIndex - The on-chain integer index of the milestone
 * @param walletAddress  - The connected wallet that triggered the action
 * @param action         - "deliver" (freelancer) | "approve" (client)
 */
export async function syncMilestoneAction(
  escrowAddress: string,
  milestoneIndex: number,
  walletAddress: string,
  action: "deliver" | "approve"
): Promise<void> {
  await post("/escrow/milestones/approve", {
    escrowAddress,
    milestoneIndex,
    walletAddress,
    action,
  });
}
