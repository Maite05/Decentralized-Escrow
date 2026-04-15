import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { decodeEventLog } from "viem";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { USDC_ADDRESS, FACTORY_ABI } from "../lib/constants";
import { registerProject, registerMilestone } from "../lib/backendSync";
import { post } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "details" | "approving" | "deploying" | "adding-milestones" | "done";

interface MilestoneDraft {
  id:          string;
  description: string;
  amount:      string;
  dueDate:     string;
}

interface CreateEscrowProps {
  initialFreelancer?: string;
  initialBudget?:     string;
  jobId?:             string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);

function totalOf(milestones: MilestoneDraft[]) {
  return milestones.reduce((s, m) => s + parseFloat(m.amount || "0"), 0);
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { key: "details",           label: "Details",    desc: "Set up escrow details and milestones"      },
  { key: "approving",         label: "Approve",    desc: "Allow the factory to spend your USDC"       },
  { key: "deploying",         label: "Deploy",     desc: "Deploy the escrow contract on-chain"        },
  { key: "adding-milestones", label: "Milestones", desc: "Register each milestone on-chain"           },
] as const;

function StepBar({ current, milestonePhase, milestoneTotal }: {
  current: Step;
  milestonePhase?: number;
  milestoneTotal?: number;
}) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="card p-4">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const done   = i < idx;
          const active = s.key === current;
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
        {current === "adding-milestones" && milestonePhase != null && milestoneTotal != null
          ? `Adding milestone ${milestonePhase + 1} of ${milestoneTotal} on-chain…`
          : STEPS[idx]?.desc}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CreateEscrow({ initialFreelancer = "", initialBudget = "", jobId }: CreateEscrowProps) {
  const [step,            setStep]            = useState<Step>("details");
  const [freelancer,      setFreelancer]      = useState(initialFreelancer);
  const [deadline,        setDeadline]        = useState("");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [milestonePhase,  setMilestonePhase]  = useState(0);
  const [copied,          setCopied]          = useState(false);

  // Milestone drafts
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(() => {
    if (initialBudget && parseFloat(initialBudget) > 0) {
      return [{ id: uid(), description: "", amount: initialBudget, dueDate: "" }];
    }
    return [{ id: uid(), description: "", amount: "", dueDate: "" }];
  });

  const { address } = useAccount();

  // Pass the deployed address once we have it so addMilestone targets the right contract
  const { approveUSDC, createProject, addMilestone, receipt, isPending, isConfirming, isConfirmed, reset } =
    useEscrowWrite(deployedAddress as `0x${string}` | undefined);

  const total    = totalOf(milestones);
  const totalWei = BigInt(Math.floor(total * 1e18));
  const isBusy   = isPending || isConfirming;

  const canProceed =
    freelancer.startsWith("0x") &&
    freelancer.length === 42 &&
    milestones.length > 0 &&
    milestones.every(m => m.description.trim() && parseFloat(m.amount || "0") > 0) &&
    total > 0;

  // ── Approve confirmed → deploy ─────────────────────────────────────────────
  useEffect(() => {
    if (isConfirmed && step === "approving") {
      setStep("deploying");
      reset();
    }
  }, [isConfirmed, step, reset]);

  // ── Deploy confirmed → extract address, sync backend, start milestone loop ─
  const deployHandledRef = useRef(false);
  useEffect(() => {
    if (!isConfirmed || step !== "deploying" || !receipt || !address) return;
    if (deployHandledRef.current) return;
    deployHandledRef.current = true;

    let escrowAddr: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics, eventName: "ProjectCreated" });
        escrowAddr = (decoded.args as { escrow: string }).escrow;
        break;
      } catch { /* not this log */ }
    }

    if (!escrowAddr) {
      console.error("[CreateEscrow] Could not find ProjectCreated event in receipt");
      return;
    }

    // Sync project to backend immediately
    registerProject(escrowAddr, address, freelancer, totalWei.toString())
      .catch(err => console.warn("[CreateEscrow] project sync failed:", err));

    setDeployedAddress(escrowAddr);
    setMilestonePhase(0);
    setStep("adding-milestones");
    reset();
  }, [isConfirmed, step, receipt, address, freelancer, totalWei, reset]);

  // ── Milestone loop: submit next addMilestone tx ────────────────────────────
  // Tracks which milestone index has been submitted to prevent double-fire.
  const submittedPhaseRef = useRef(-1);
  useEffect(() => {
    if (step !== "adding-milestones" || !deployedAddress) return;
    if (isPending || isConfirming || isConfirmed) return;
    if (milestonePhase >= milestones.length) return;
    if (submittedPhaseRef.current === milestonePhase) return;

    submittedPhaseRef.current = milestonePhase;
    const m = milestones[milestonePhase];
    const amtWei = BigInt(Math.floor(parseFloat(m.amount) * 1e18));
    addMilestone(amtWei, m.description);
  }, [step, milestonePhase, deployedAddress, isPending, isConfirming, isConfirmed, milestones, addMilestone]);

  // ── Milestone confirmed → register in backend, advance or finish ───────────
  const confirmedPhaseRef = useRef(-1);
  useEffect(() => {
    if (!isConfirmed || step !== "adding-milestones" || !deployedAddress) return;
    if (confirmedPhaseRef.current === milestonePhase) return;
    confirmedPhaseRef.current = milestonePhase;

    // Sync this milestone to backend
    const m = milestones[milestonePhase];
    const amtWei = BigInt(Math.floor(parseFloat(m.amount) * 1e18));
    registerMilestone(deployedAddress, milestonePhase, m.description, amtWei.toString())
      .catch(err => console.warn(`[CreateEscrow] milestone ${milestonePhase} sync failed:`, err));

    const isLast = milestonePhase + 1 >= milestones.length;
    if (isLast) {
      // All milestones added — optionally sync hire
      if (jobId && address) {
        post(`/jobs/${jobId}/hire`, {
          freelancerWallet: freelancer,
          escrowAddress:    deployedAddress,
          deadline:         deadline ? new Date(deadline).toISOString() : undefined,
        }).catch(err => console.warn("[CreateEscrow] hire sync failed:", err));
      }
      setStep("done");
    } else {
      setMilestonePhase(p => p + 1);
      reset();
    }
  }, [isConfirmed, step, deployedAddress, milestonePhase, milestones, jobId, address, freelancer, deadline, reset]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep("details");
    setFreelancer("");
    setDeadline("");
    setDeployedAddress(null);
    setMilestonePhase(0);
    setCopied(false);
    deployHandledRef.current   = false;
    submittedPhaseRef.current  = -1;
    confirmedPhaseRef.current  = -1;
    setMilestones([{ id: uid(), description: "", amount: "", dueDate: "" }]);
    reset();
  };

  // ── Milestone helpers ─────────────────────────────────────────────────────
  const addMilestoneDraft = () =>
    setMilestones(ms => [...ms, { id: uid(), description: "", amount: "", dueDate: "" }]);

  const removeMilestone = (id: string) =>
    setMilestones(ms => ms.filter(m => m.id !== id));

  const updateMilestone = (id: string, field: keyof MilestoneDraft, value: string) =>
    setMilestones(ms => ms.map(m => m.id === id ? { ...m, [field]: value } : m));

  // ── Copy address ─────────────────────────────────────────────────────────
  const copyAddress = () => {
    if (deployedAddress) {
      navigator.clipboard.writeText(deployedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
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
            <p className="text-sm text-slate-500">
              {milestones.length} milestone{milestones.length !== 1 ? "s" : ""} on-chain · {total.toLocaleString()} USDC locked
            </p>
          </div>
        </div>

        {deployedAddress && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contract address</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-slate-700 flex-1 break-all">{deployedAddress}</code>
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

  return (
    <div className="space-y-5">
      <StepBar
        current={step}
        milestonePhase={step === "adding-milestones" ? milestonePhase : undefined}
        milestoneTotal={step === "adding-milestones" ? milestones.length : undefined}
      />

      {/* ── Main form ── */}
      <div className="card p-6 space-y-6">

        {/* Freelancer address */}
        <div>
          <label className="label" htmlFor="freelancer">Freelancer wallet address</label>
          <input id="freelancer" type="text" placeholder="0x…"
            value={freelancer} onChange={e => setFreelancer(e.target.value)}
            disabled={step !== "details"} className="input font-mono" />
        </div>

        {/* Project deadline */}
        <div>
          <label className="label" htmlFor="deadline">Project deadline</label>
          <input id="deadline" type="date" className="input"
            min={new Date().toISOString().split("T")[0]}
            value={deadline} onChange={e => setDeadline(e.target.value)}
            disabled={step !== "details"} />
          <p className="text-xs text-slate-400 mt-1">Agreed completion date — stored with the escrow</p>
        </div>

        {/* ── Milestone planner ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Milestones</label>
            {step === "details" && (
              <button type="button" onClick={addMilestoneDraft}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add milestone
              </button>
            )}
          </div>

          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={m.id}
                className={`bg-slate-50 rounded-xl p-4 space-y-3 border transition-colors
                  ${step === "adding-milestones" && i === milestonePhase
                    ? "border-blue-300 bg-blue-50"
                    : step === "adding-milestones" && i < milestonePhase
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-slate-100"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {step === "adding-milestones" && i < milestonePhase ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center
                        ${step === "adding-milestones" && i === milestonePhase
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-blue-100 text-blue-700"}`}>
                        {i + 1}
                      </span>
                    )}
                    <span className="text-sm font-medium text-slate-700">Milestone {i + 1}</span>
                    {step === "adding-milestones" && i === milestonePhase && (
                      <span className="text-xs text-blue-600 font-medium">Adding on-chain…</span>
                    )}
                    {step === "adding-milestones" && i < milestonePhase && (
                      <span className="text-xs text-emerald-600 font-medium">On-chain</span>
                    )}
                  </div>
                  {milestones.length > 1 && step === "details" && (
                    <button type="button" onClick={() => removeMilestone(m.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors" aria-label="Remove">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label text-xs" htmlFor={`desc-${m.id}`}>Deliverable</label>
                    <input id={`desc-${m.id}`} type="text"
                      placeholder="e.g. Design mockups approved"
                      value={m.description}
                      onChange={e => updateMilestone(m.id, "description", e.target.value)}
                      disabled={step !== "details"}
                      className="input text-sm" />
                  </div>
                  <div>
                    <label className="label text-xs" htmlFor={`amt-${m.id}`}>Amount (USDC)</label>
                    <input id={`amt-${m.id}`} type="number" placeholder="0.00" min="0"
                      value={m.amount}
                      onChange={e => updateMilestone(m.id, "amount", e.target.value)}
                      disabled={step !== "details"}
                      className="input text-sm" />
                  </div>
                </div>
                <div>
                  <label className="label text-xs" htmlFor={`due-${m.id}`}>Due date <span className="text-slate-400">(optional)</span></label>
                  <input id={`due-${m.id}`} type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={m.dueDate}
                    onChange={e => updateMilestone(m.id, "dueDate", e.target.value)}
                    disabled={step !== "details"}
                    className="input text-sm" />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-slate-500">{milestones.length} milestone{milestones.length !== 1 ? "s" : ""}</span>
            <span className="font-bold text-slate-900">
              Total: {total > 0 ? `${total.toLocaleString()} USDC` : "—"}
            </span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        {step === "details" && (
          <button type="button"
            onClick={() => {
              if (!canProceed) return;
              setStep("approving");
              approveUSDC(totalWei);
            }}
            disabled={!canProceed}
            className="btn-primary w-full py-3"
          >
            Approve {total > 0 ? `${total.toLocaleString()} USDC` : ""} →
          </button>
        )}

        {step === "approving" && (
          isBusy ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3 justify-center">
              <Spinner /> Waiting for approval confirmation…
            </div>
          ) : (
            <button type="button"
              onClick={() => createProject(freelancer as `0x${string}`, USDC_ADDRESS, totalWei)}
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

        {step === "adding-milestones" && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-3 justify-center">
            <Spinner />
            {isPending
              ? `Confirm milestone ${milestonePhase + 1} in your wallet…`
              : isConfirming
              ? `Registering milestone ${milestonePhase + 1} on-chain…`
              : `Preparing milestone ${milestonePhase + 1}…`}
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
