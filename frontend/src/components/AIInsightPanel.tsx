import { useAiRisk } from "../hooks/useJobs";
import type { AiRiskResponse } from "../lib/api";

const FALLBACK: AiRiskResponse = {
  score: 45,
  signals: [],
  suggestion: "Monitoring — backend unavailable.",
};

function scoreColor(score: number) {
  if (score < 40) return { bar: "bg-emerald-500", text: "text-emerald-600", label: "Low Risk", bg: "bg-emerald-50 border-emerald-200" };
  if (score < 70) return { bar: "bg-amber-400",   text: "text-amber-600",   label: "Medium Risk", bg: "bg-amber-50 border-amber-200" };
  return             { bar: "bg-red-500",     text: "text-red-600",     label: "High Risk",   bg: "bg-red-50 border-red-200" };
}

const TYPE_LABELS: Record<string, string> = {
  ACTIVE_DISPUTE:    "Active Dispute",
  PAST_DISPUTE:      "Past Dispute",
  REFUNDED:          "Refunded",
  NO_MILESTONES:     "No Milestones",
  AWAITING_APPROVAL: "Awaiting Approval",
  ALL_RELEASED:      "All Released",
};

interface Props {
  projectId: string;
}

export function AIInsightPanel({ projectId }: Props) {
  const { data, isLoading, isError } = useAiRisk(projectId);

  const insight = data ?? (isError ? FALLBACK : null);
  const colors = insight ? scoreColor(insight.score) : null;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">AI Risk Analysis</h3>
        </div>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing…
          </span>
        )}
        {isError && !data && (
          <span className="text-xs text-slate-400 italic">offline — fallback mode</span>
        )}
      </div>

      {isLoading && !insight ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-slate-100 rounded-full w-full" />
          <div className="h-3 bg-slate-100 rounded-full w-2/3" />
        </div>
      ) : insight && colors ? (
        <>
          {/* Score gauge */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Risk Score</span>
              <span className={`text-sm font-bold tabular-nums ${colors.text}`}>
                {insight.score}<span className="text-xs font-normal text-slate-400">/100</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                style={{ width: `${insight.score}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Safe</span>
              <span className={`font-semibold ${colors.text}`}>{colors.label}</span>
              <span>Critical</span>
            </div>
          </div>

          {/* Signals */}
          {insight.signals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Signals</p>
              <ul className="space-y-1.5">
                {insight.signals.map((sig, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-medium text-slate-700">{TYPE_LABELS[sig.type] ?? sig.type}</span>
                      {" — "}{sig.description}
                    </span>
                    <span className="text-xs font-mono text-slate-400 shrink-0 tabular-nums">
                      {sig.confidence}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestion */}
          <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 ${colors.bg}`}>
            <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-600 leading-relaxed">{insight.suggestion}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
