import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { decodeEventLog } from "viem";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { USDC_ADDRESS, FACTORY_ABI } from "../lib/constants";
import { registerProject } from "../lib/backendSync";

type Step = "idle" | "approving" | "deploying" | "done";

export function CreateEscrow() {
  const [step, setStep] = useState<Step>("idle");
  const [freelancer, setFreelancer] = useState("");
  const [amountStr, setAmountStr] = useState("");

  const { address } = useAccount();

  const {
    approveUSDC,
    createProject,
    receipt,
    isPending,
    isConfirming,
    isConfirmed,
    reset,
  } = useEscrowWrite();

  const isBusy = isPending || isConfirming;
  const amountWei = BigInt(Math.floor(parseFloat(amountStr || "0") * 1e18));

  // USDC approval confirmed → move to deploy step
  useEffect(() => {
    if (isConfirmed && step === "approving") {
      setStep("deploying");
      reset();
    }
  }, [isConfirmed, step, reset]);

  // Deploy confirmed → parse event, sync to backend, mark done
  useEffect(() => {
    if (!isConfirmed || step !== "deploying" || !receipt || !address) return;

    let escrowAddress: string | undefined;

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: FACTORY_ABI,
          data: log.data,
          topics: log.topics,
          eventName: "ProjectCreated",
        });
        // ProjectCreated(projectId, escrow, client, freelancer, token, totalAmount)
        escrowAddress = (decoded.args as { escrow: string }).escrow;
        break;
      } catch {
        // log belongs to a different contract/event — skip
      }
    }

    setStep("done");

    if (escrowAddress) {
      registerProject(
        escrowAddress,
        address,
        freelancer,
        amountWei.toString()
      ).catch((err) =>
        console.warn("[CreateEscrow] backend sync failed:", err)
      );
    }
  }, [isConfirmed, step, receipt, address, freelancer, amountWei]);

  const handleApprove = () => {
    if (!amountStr || amountWei === 0n) return;
    setStep("approving");
    approveUSDC(amountWei);
  };

  const handleCreate = () => {
    if (!freelancer || amountWei === 0n) return;
    createProject(freelancer as `0x${string}`, USDC_ADDRESS, amountWei);
  };

  const handleReset = () => {
    setStep("idle");
    setFreelancer("");
    setAmountStr("");
    reset();
  };

  if (step === "done") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium">
          Escrow created successfully!
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-md">
      <h2 className="text-xl font-semibold text-gray-900">New Escrow Project</h2>

      {/* Step indicator */}
      <div className="flex gap-2 text-sm">
        {(["idle", "approving", "deploying"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-blue-600 text-white"
                  : i < ["idle", "approving", "deploying"].indexOf(step)
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-gray-600 capitalize">
              {s === "idle" ? "Details" : s === "approving" ? "Approve" : "Deploy"}
            </span>
            {i < 2 && <span className="text-gray-300 ml-1">→</span>}
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Freelancer address (0x…)"
        value={freelancer}
        onChange={(e) => setFreelancer(e.target.value)}
        disabled={step !== "idle"}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />

      <input
        type="number"
        placeholder="Amount (USDC)"
        min="0"
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        disabled={step !== "idle"}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      />

      {step === "idle" && (
        <button
          onClick={handleApprove}
          disabled={!freelancer || !amountStr || amountWei === 0n}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          Step 1: Approve USDC
        </button>
      )}

      {step === "approving" && (
        <div className="space-y-2">
          {isBusy ? (
            <p className="text-sm text-gray-500 animate-pulse">
              Waiting for approval confirmation…
            </p>
          ) : (
            <button
              onClick={handleCreate}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Step 2: Deploy Escrow
            </button>
          )}
        </div>
      )}

      {step === "deploying" && isBusy && (
        <p className="text-sm text-gray-500 animate-pulse">
          Deploying escrow contract…
        </p>
      )}
    </div>
  );
}
