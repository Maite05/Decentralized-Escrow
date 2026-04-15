import { useEscrowEvents } from "../hooks/useEscrowEvents";
import type { ActivityItem } from "../lib/api";

interface Props {
  escrowAddress?: `0x${string}`;
  activities?: ActivityItem[];
}

type EventLike = {
  type: string;
  description?: string;
  txHash?: string | null;
  timestamp?: string;
  blockNumber?: number | bigint | null;
};

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  Released:            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",  color: "text-emerald-600", label: "Released"  },
  MILESTONE_RELEASED:  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",  color: "text-emerald-600", label: "Released"  },
  Delivered:           { icon: "M5 13l4 4L19 7",                                    color: "text-indigo-600",  label: "Delivered" },
  MILESTONE_DELIVERED: { icon: "M5 13l4 4L19 7",                                    color: "text-indigo-600",  label: "Delivered" },
  DisputeRaised:       { icon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", color: "text-red-500",     label: "Disputed"  },
  DISPUTE_RAISED:      { icon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", color: "text-red-500",     label: "Disputed"  },
  DisputeResolved:     { icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", color: "text-amber-600", label: "Resolved"  },
  DISPUTE_RESOLVED:    { icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", color: "text-amber-600", label: "Resolved"  },
  PROJECT_CREATED:     { icon: "M12 4v16m8-8H4",                                    color: "text-slate-500",   label: "Created"   },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? {
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-slate-400",
    label: type,
  };
}

function fmt(ts?: string | null, blockNumber?: number | bigint | null): string {
  if (ts) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  if (blockNumber != null) return `block #${blockNumber}`;
  return "pending";
}

function shorten(hash?: string | null) {
  if (!hash) return null;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function TxLog({ escrowAddress, activities }: Props) {
  const { events } = useEscrowEvents(
    escrowAddress ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  );

  const items: EventLike[] =
    activities && activities.length > 0 ? activities : events;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm text-slate-400">No activity yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, i) => {
        const meta = getTypeMeta(item.type);
        const hash =
          "txHash" in item ? item.txHash :
          "transactionHash" in item ? (item as { transactionHash?: string | null }).transactionHash :
          null;
        const ts    = "timestamp"   in item ? item.timestamp : undefined;
        const block = "blockNumber" in item ? (item as { blockNumber?: number | bigint | null }).blockNumber : undefined;
        const desc  = "description" in item ? item.description : undefined;

        return (
          <li key={i} className="flex items-start gap-3 py-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className={`w-3.5 h-3.5 ${meta.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={meta.icon} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                {hash && (
                  <span className="font-mono text-xs text-slate-400" title={hash}>
                    {shorten(hash)}
                  </span>
                )}
              </div>
              {desc && <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>}
            </div>
            <span className="text-xs text-slate-400 shrink-0 tabular-nums">{fmt(ts, block)}</span>
          </li>
        );
      })}
    </ul>
  );
}
