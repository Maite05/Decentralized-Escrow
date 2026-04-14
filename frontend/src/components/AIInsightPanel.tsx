import { useQuery } from "@tanstack/react-query";
import { get, MOCK_INSIGHT } from "../lib/api";

interface InsightResponse {
  risk: string;
  summary: string;
}

interface Props {
  projectId: string;
}

export function AIInsightPanel({ projectId }: Props) {
  const { data, isLoading, isError } = useQuery<InsightResponse>({
    queryKey: ["ai-insight", projectId],
    queryFn: () => get<InsightResponse>(`/escrow/ai/risk/${projectId}`),
    refetchInterval: 60_000,
    retry: 1,
  });

  const insight: InsightResponse = isError || !data ? MOCK_INSIGHT : data;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-blue-800 text-sm">AI Risk Insight</h3>
        {isLoading && (
          <span className="text-xs text-blue-400 animate-pulse">loading…</span>
        )}
        {isError && (
          <span className="text-xs text-orange-400">(mock — backend offline)</span>
        )}
      </div>

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
    </div>
  );
}
