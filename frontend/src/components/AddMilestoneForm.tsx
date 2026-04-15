import { useEffect, useRef, useState } from "react";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { registerMilestone } from "../lib/backendSync";

interface Props {
  escrowAddress: `0x${string}`;
  nextIndex: number;
}

export function AddMilestoneForm({ escrowAddress, nextIndex }: Props) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [open, setOpen] = useState(false);

  const { addMilestone, isPending, isConfirming, isConfirmed, reset } =
    useEscrowWrite(escrowAddress);

  const submittedRef = useRef<{ description: string; amountWei: bigint } | null>(null);
  const amountWei = BigInt(Math.floor(parseFloat(amountStr || "0") * 1e18));
  const isBusy = isPending || isConfirming;

  useEffect(() => {
    if (!isConfirmed || !submittedRef.current) return;
    const { description: desc, amountWei: amt } = submittedRef.current;
    submittedRef.current = null;
    registerMilestone(escrowAddress, nextIndex, desc, amt.toString())
      .catch((err) => console.warn("[AddMilestoneForm] backend sync failed:", err));
    setDescription("");
    setAmountStr("");
    setOpen(false);
    reset();
  }, [isConfirmed, escrowAddress, nextIndex, reset]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200
                   rounded-2xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600
                   hover:bg-blue-50 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Milestone #{nextIndex + 1}
      </button>
    );
  }

  return (
    <div className="card p-5 space-y-4 border-blue-200 ring-1 ring-blue-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Milestone #{nextIndex + 1}
        </h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setDescription(""); setAmountStr(""); }}
          disabled={isBusy}
          aria-label="Cancel"
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <label className="label" htmlFor="ms-desc">Deliverable description</label>
        <input
          id="ms-desc"
          type="text"
          placeholder="e.g. Design mockups delivered and approved"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isBusy}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="ms-amount">Payment amount</label>
        <div className="relative">
          <input
            id="ms-amount"
            type="number"
            placeholder="0.00"
            min="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={isBusy}
            className="input pr-16"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
            tokens
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!description.trim() || amountWei === 0n) return;
          submittedRef.current = { description: description.trim(), amountWei };
          addMilestone(amountWei, description.trim());
        }}
        disabled={isBusy || !description.trim() || amountWei === 0n}
        className="btn-primary w-full py-2.5"
      >
        {isPending ? (
          <><Spinner /> Confirm in wallet…</>
        ) : isConfirming ? (
          <><Spinner /> Confirming…</>
        ) : (
          "Add Milestone On-chain"
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
