import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi } from "viem";
import {
  get,
  encodePaymentHeader,
  PaymentRequiredError,
  X402PaymentRequired,
  MOCK_INSIGHT,
} from "../lib/api";

interface InsightResponse {
  risk: string;
  summary: string;
}

interface Props {
  projectId: string;
}

export function AIInsightPanel({ projectId }: Props) {
  const [paymentHeader, setPaymentHeader] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<X402PaymentRequired | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>(undefined);

  // ─── Fetch AI risk (includes X-Payment header once paid) ───────────────
  const { data, isLoading, isError, error, refetch } = useQuery<InsightResponse>({
    queryKey: ["ai-insight", projectId, paymentHeader],
    queryFn: () =>
      get<InsightResponse>(
        `/escrow/ai/risk/${projectId}`,
        paymentHeader ? { "X-Payment": paymentHeader } : undefined,
      ),
    refetchInterval: paymentHeader ? 60_000 : false,
    retry: false,
  });

  // Capture payment requirements when the server returns 402.
  useEffect(() => {
    if (error instanceof PaymentRequiredError) {
      setRequirements(error.requirements);
    }
  }, [error]);

  // ─── USDC transfer to unlock AI call ───────────────────────────────────
  const { writeContract, data: txHash, isPending: isSigning } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: txConfirmed } =
    useWaitForTransactionReceipt({ hash: pendingTxHash });

  // Track the tx hash once the wallet signs.
  useEffect(() => {
    if (txHash) setPendingTxHash(txHash);
  }, [txHash]);

  // Once payment confirmed, build the X-Payment header and refetch.
  useEffect(() => {
    if (txConfirmed && pendingTxHash && requirements) {
      const chainId = parseInt(requirements.network.split(":")[1], 10);
      setPaymentHeader(encodePaymentHeader(pendingTxHash, chainId));
    }
  }, [txConfirmed, pendingTxHash, requirements]);

  const handlePay = () => {
    if (!requirements) return;
    writeContract({
      address: requirements.asset,
      abi: erc20Abi,
      functionName: "transfer",
      args: [requirements.payTo, BigInt(requirements.maxAmountRequired)],
    });
  };

  // ─── Derive display state ───────────────────────────────────────────────
  const needsPayment = error instanceof PaymentRequiredError && !paymentHeader;
  const insight: InsightResponse = !data || isError ? MOCK_INSIGHT : data;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-blue-800 text-sm">AI Risk Insight</h3>
        {isLoading && (
          <span className="text-xs text-blue-400 animate-pulse">loading…</span>
        )}
        {isError && !needsPayment && (
          <span className="text-xs text-orange-400">(mock — backend offline)</span>
        )}
        {isError && needsPayment && (
          <span className="text-xs text-yellow-600">(payment required)</span>
        )}
      </div>

      {needsPayment ? (
        <div className="space-y-2">
          <p className="text-sm text-blue-700">
            This AI call costs{" "}
            <strong>0.01 USDC</strong> on X Layer (x402 micropayment).
          </p>
          <button
            type="button"
            onClick={handlePay}
            disabled={isSigning || isConfirming}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {isSigning
              ? "Confirm in wallet…"
              : isConfirming
              ? "Confirming…"
              : "Pay 0.01 USDC to unlock"}
          </button>
          {pendingTxHash && !txConfirmed && (
            <p className="text-xs text-blue-500 break-all">
              Tx: {pendingTxHash}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700">Risk:</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                insight.risk === "Low"
                  ? "bg-green-100 text-green-700"
                  : insight.risk === "High"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {insight.risk}
            </span>
          </div>
          <p className="text-sm text-blue-700">{insight.summary}</p>
        </>
      )}
    </div>
  );
}
