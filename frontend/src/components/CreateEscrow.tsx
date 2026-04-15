import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { decodeEventLog } from "viem";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { USDC_ADDRESS, FACTORY_ABI } from "../lib/constants";
import { registerProject } from "../lib/backendSync";

type Step = "idle" | "approving" | "deploying" | "done";

const STEPS = [
  { key: "idle",      label: "Details",  desc: "Enter freelancer address and amount" },
  { key: "approving", label: "Approve",  desc: "Allow the factory to spend your tokens" },
  { key: "deploying", label: "Deploy",   desc: "Deploy the escrow contract on-chain" },
] as const;

interface CreateEscrowProps {
  initialFreelancer?: string;
  initialBudget?: string;
}

export function CreateEscrow({ initialFreelancer = "", initialBudget = "" }: CreateEscrowProps) {
  const [step, setStep] = useState<Step>("idle");
  const [freelancer, setFreelancer] = useState(initialFreelancer);
  const [amountStr, setAmountStr] = useState(initialBudget);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { address } = useAccount();
  const { approveUSDC, createProject, receipt, isPending, isConfirming, isConfirmed, reset } =
    useEscrowWrite();

  const amountWei = BigInt(Math.floor(parseFloat(amountStr || "0") * 1e18));
  const isBusy = isPending || isConfirming;

  // Step 1 confirmed → move to deploy
  useEffect(() => {
    if (isConfirmed && step === "approving") {
      setStep("deploying");
      reset();
    }
  }, [isConfirmed, step, reset]);

  // Step 2 confirmed → parse event, sync backend, show success
  useEffect(() => {
    if (!isConfirmed || step !== "deploying" || !receipt || !address) return;

    let escrowAddr: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics, eventName: "ProjectCreated" });
        escrowAddr = (decoded.args as { escrow: string }).escrow;
        break;
      } catch { /* not this event */ }
    }

    setDeployedAddress(escrowAddr ?? null);
    setStep("done");

    if (escrowAddr) {
      registerProject(escrowAddr, address, freelancer, amountWei.toString())
        .catch((err) => console.warn("[CreateEscrow] backend sync failed:", err));
    }
  }, [isConfirmed, step, receipt, address, freelancer, amountWei]);

  const handleReset = () => {
    setStep("idle");
    setFreelancer("");
    setAmountStr("");
    setDeployedAddress(null);
    reset();
  };

  const copyAddress = () => {
    if (deployedAddress) {
      navigator.clipboard.writeText(deployedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (step === "done") {
    return (
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Escrow deployed!</h2>
            <p className="text-sm text-slate-500">Your contract is live on-chain.</p>
          </div>
        </div>

        {deployedAddress && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contract address</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-slate-700 flex-1 break-all">
                {deployedAddress}
              </code>
              <button type="button" onClick={copyAddress}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {deployedAddress && (
            <Link href={`/escrow/${deployedAddress}`} className="btn-primary flex-1 text-center">
              Open project
            </Link>
          )}
          <button type="button" onClick={handleReset} className="btn-secondary flex-1">
            Create another
          </button>
        </div>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="card p-4">
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = i < currentStepIdx;
            const active = s.key === step;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                    {done ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${active ? "text-slate-900" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${done ? "bg-emerald-300" : "bg-slate-100"}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {STEPS[currentStepIdx]?.desc}
        </p>
      </div>

      {/* Form */}
      <div className="card p-6 space-y-5">
        <div>
          <label className="label" htmlFor="freelancer">Freelancer wallet address</label>
          <input
            id="freelancer"
            type="text"
            placeholder="0x…"
            value={freelancer}
            onChange={(e) => setFreelancer(e.target.value)}
            disabled={step !== "idle"}
            className="input font-mono"
          />
        </div>

        <div>
          <label className="label" htmlFor="amount">Total budget</label>
          <div className="relative">
            <input
              id="amount"
              type="number"
              placeholder="0.00"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={step !== "idle"}
              className="input pr-16"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
              USDC
            </span>
          </div>
        </div>

        {step === "idle" && (
          <button type="button" onClick={() => {
            if (!amountStr || amountWei === 0n) return;
            setStep("approving");
            approveUSDC(amountWei);
          }}
            disabled={!freelancer || !amountStr || amountWei === 0n}
            className="btn-primary w-full py-3"
          >
            Approve USDC →
          </button>
        )}

        {step === "approving" && (
          isBusy ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3 justify-center">
              <Spinner />
              Waiting for approval confirmation…
            </div>
          ) : (
            <button type="button"
              onClick={() => createProject(freelancer as `0x${string}`, USDC_ADDRESS, amountWei)}
              className="btn-success w-full py-3"
            >
              Deploy Escrow Contract →
            </button>
          )
        )}

        {step === "deploying" && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-3 justify-center">
            <Spinner />
            {isPending ? "Confirm in your wallet…" : "Deploying contract…"}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
