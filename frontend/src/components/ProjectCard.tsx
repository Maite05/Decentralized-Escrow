import Link from "next/link";
import { useAccount } from "wagmi";
import { useProject, useMilestoneCount } from "../hooks/useEscrow";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface Props {
  escrowAddress: `0x${string}`;
}

export function ProjectCard({ escrowAddress }: Props) {
  const { address: connectedWallet } = useAccount();
  const { data: projectData, isLoading: projectLoading } = useProject(escrowAddress);
  const { data: countData } = useMilestoneCount(escrowAddress);

  const [, client, freelancer, , totalAmount] = (projectData as
    | [bigint, `0x${string}`, `0x${string}`, `0x${string}`, bigint, bigint]
    | undefined) ?? [0n, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, 0n, 0n];

  const milestoneCount = Number(countData ?? 0n);
  const budgetFormatted = totalAmount
    ? (Number(totalAmount) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "—";

  const isClient = connectedWallet?.toLowerCase() === client.toLowerCase();
  const isFreelancer = connectedWallet?.toLowerCase() === freelancer.toLowerCase();
  const role = isClient ? "Client" : isFreelancer ? "Freelancer" : null;

  if (projectLoading) {
    return (
      <div className="card p-5 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-2 bg-slate-100 rounded w-full" />
      </div>
    );
  }

  return (
    <Link href={`/escrow/${escrowAddress}`}>
      <div className="card p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="font-mono text-sm text-slate-700 truncate">
              {shorten(escrowAddress)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {shorten(client)} → {shorten(freelancer)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {role && (
              <span className={`badge ${role === "Client" ? "badge-blue" : "badge-green"}`}>
                {role}
              </span>
            )}
            <svg
              className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>
            <span className="font-semibold text-slate-900">{budgetFormatted}</span>
            {" "}tokens
          </span>
          <span className="text-slate-300">·</span>
          <span>
            <span className="font-semibold text-slate-900">{milestoneCount}</span>
            {" "}{milestoneCount === 1 ? "milestone" : "milestones"}
          </span>
        </div>
      </div>
    </Link>
  );
}
