import { useEffect, useRef, useState } from "react";
import { useEscrowWrite } from "../hooks/useEscrowWrite";
import { registerMilestone } from "../lib/backendSync";

interface Props {
  escrowAddress: `0x${string}`;
  /** The next milestone index (= current milestone count). */
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

  // After confirmation, sync to backend then reset the form
  useEffect(() => {
    if (!isConfirmed || !submittedRef.current) return;
    const { description: desc, amountWei: amt } = submittedRef.current;
    submittedRef.current = null;

    registerMilestone(escrowAddress, nextIndex, desc, amt.toString()).catch(
      (err) => console.warn("[AddMilestoneForm] backend sync failed:", err)
    );

    setDescription("");
    setAmountStr("");
    setOpen(false);
    reset();
  }, [isConfirmed, escrowAddress, nextIndex, reset]);

  const handleSubmit = () => {
    if (!description.trim() || amountWei === 0n) return;
    submittedRef.current = { description: description.trim(), amountWei };
    addMilestone(amountWei, description.trim());
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-dashed border-blue-400 text-blue-600 rounded-xl text-sm hover:bg-blue-50 w-full"
      >
        + Add Milestone
      </button>
    );
  }

  return (
    <div className="border border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50">
      <h3 className="text-sm font-semibold text-blue-800">
        New Milestone #{nextIndex}
      </h3>

      <input
        type="text"
        placeholder="Deliverable description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isBusy}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />

      <input
        type="number"
        placeholder="Amount (tokens)"
        min="0"
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        disabled={isBusy}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isBusy || !description.trim() || amountWei === 0n}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {isPending
            ? "Confirm in wallet…"
            : isConfirming
            ? "Confirming…"
            : "Add On-chain"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setDescription("");
            setAmountStr("");
          }}
          disabled={isBusy}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
