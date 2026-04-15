import { useState } from "react";
import { calcFees, fmtUSDC } from "../lib/fees";

interface Props {
  /** Gross milestone/job amount in USDC */
  amount: number | string;
  /** 'client' — shows what client pays; 'freelancer' — shows net payout */
  mode: "client" | "freelancer";
  /** Start collapsed; user can expand */
  collapsed?: boolean;
  /** Extra Tailwind classes on the wrapper */
  className?: string;
}

export function FeeBreakdown({ amount, mode, collapsed = false, className = "" }: Props) {
  const [open, setOpen] = useState(!collapsed);
  const fees = calcFees(amount);
  const gross = fees.grossAmount;

  if (gross <= 0) return null;

  const summaryLine =
    mode === "client"
      ? `You pay $${fmtUSDC(fees.clientPays)} USDC (incl. 8% fee)`
      : `You receive $${fmtUSDC(fees.netPayout)} USDC net`;

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 text-sm ${className}`}>
      {/* Header / summary row */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 gap-2 text-left"
      >
        <span className="font-medium text-amber-900 text-xs">{summaryLine}</span>
        <svg
          className={`w-3.5 h-3.5 text-amber-600 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Detail rows */}
      {open && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-amber-200">
          {mode === "client" ? (
            <>
              <FeeRow label="Milestone amount" value={fees.grossAmount} />
              <FeeRow label="Platform fee (8%)" value={fees.clientFee} warn />
              <FeeRow label="Total you pay" value={fees.clientPays} bold />
            </>
          ) : (
            <>
              <FeeRow label="Milestone amount" value={fees.grossAmount} />
              <FeeRow label="Platform fee (8%)" value={-fees.platformFee} warn />
              <FeeRow label="Sepolia gas fee" value={-fees.gasFeeSepolia} warn />
              <FeeRow label="You receive" value={fees.netPayout} bold positive />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FeeRow({
  label,
  value,
  warn = false,
  bold = false,
  positive = false,
}: {
  label: string;
  value: number;
  warn?: boolean;
  bold?: boolean;
  positive?: boolean;
}) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const textCls = positive
    ? "text-emerald-700 font-semibold"
    : warn
    ? "text-amber-700"
    : bold
    ? "text-amber-900 font-semibold"
    : "text-amber-800";

  return (
    <div className={`flex items-center justify-between gap-2 text-xs pt-1 ${bold ? "border-t border-amber-200 mt-1" : ""}`}>
      <span className="text-amber-700">{label}</span>
      <span className={`font-mono tabular-nums ${textCls}`}>
        {sign}${fmtUSDC(abs)} USDC
      </span>
    </div>
  );
}

/**
 * Compact inline version — just the single summary line with no expand.
 */
export function FeeTag({
  amount,
  mode,
  className = "",
}: {
  amount: number | string;
  mode: "client" | "freelancer";
  className?: string;
}) {
  const fees = calcFees(amount);
  if (fees.grossAmount <= 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 ${className}`}>
      <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {mode === "client"
        ? `You pay $${fmtUSDC(fees.clientPays)} incl. 8%`
        : `Net $${fmtUSDC(fees.netPayout)}`}
    </span>
  );
}
