import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  FACTORY_ADDRESS,
  FACTORY_ABI,
  ESCROW_ABI,
  USDC_ADDRESS,
  ERC20_ABI,
} from "../lib/constants";

/**
 * Write hooks for all escrow-related transactions.
 *
 * @param escrowAddress - Optional deployed MilestoneEscrow address.
 *                        Required for escrow-level calls (markDelivered, etc.).
 *
 * Returns: action callbacks + transaction status flags.
 *   isPending    — tx submitted, waiting for wallet / mempool
 *   isConfirming — tx mined, waiting for receipt
 *   isConfirmed  — receipt received; tx succeeded
 */
export function useEscrowWrite(escrowAddress?: `0x${string}`) {
  const {
    writeContract,
    data: hash,
    isPending,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  /** Step 1 of project creation: approve USDC for the EscrowFactory. */
  function approveUSDC(amount: bigint): void {
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [FACTORY_ADDRESS, amount],
    });
  }

  /** Step 2 of project creation: deploy a new MilestoneEscrow via the factory. */
  function createProject(
    freelancer: `0x${string}`,
    token: `0x${string}`,
    totalAmount: bigint
  ): void {
    writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "createProject",
      args: [freelancer, token, totalAmount],
    });
  }

  function requireEscrow(): `0x${string}` {
    if (!escrowAddress) throw new Error("useEscrowWrite: no escrowAddress provided");
    return escrowAddress;
  }

  /** Freelancer signals a milestone has been completed. */
  function markDelivered(milestoneId: bigint): void {
    writeContract({
      address: requireEscrow(),
      abi: ESCROW_ABI,
      functionName: "markDelivered",
      args: [milestoneId],
    });
  }

  /** Client approves a delivered milestone and releases payment. */
  function approveMilestone(milestoneId: bigint): void {
    writeContract({
      address: requireEscrow(),
      abi: ESCROW_ABI,
      functionName: "approveMilestone",
      args: [milestoneId],
    });
  }

  /** Client adds a new milestone to an already-deployed escrow. */
  function addMilestone(amount: bigint, description: string): void {
    writeContract({
      address: requireEscrow(),
      abi: ESCROW_ABI,
      functionName: "addMilestone",
      args: [amount, description],
    });
  }

  /** Either party opens a dispute on a milestone. */
  function raiseDispute(milestoneId: bigint): void {
    writeContract({
      address: requireEscrow(),
      abi: ESCROW_ABI,
      functionName: "raiseDispute",
      args: [milestoneId],
    });
  }

  return {
    approveUSDC,
    createProject,
    addMilestone,
    markDelivered,
    approveMilestone,
    raiseDispute,
    hash,
    receipt,
    isPending,
    isConfirming,
    isConfirmed,
    reset,
  };
}
