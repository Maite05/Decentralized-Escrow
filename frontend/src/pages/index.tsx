import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Navbar } from "../components/Navbar";
import { TxLog } from "../components/TxLog";
import { useWallet } from "../hooks/useWallet";
import { useDashboard } from "../hooks/useJobs";
import type { EscrowProject } from "../lib/api";

const Dashboard: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: dash, isLoading } = useDashboard(address);

  if (!isConnected) return <LandingPage />;

  const clientProjects     = dash?.projects.filter((p) => p.client.walletAddress === address?.toLowerCase()) ?? [];
  const freelancerProjects = dash?.projects.filter((p) => p.freelancer.walletAddress === address?.toLowerCase()) ?? [];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </p>
          </div>
          <Link href="/create" className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Escrow
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-20" />
            ))
          ) : (
            <>
              <StatTile label="Locked USDC"  value={`$${dash?.totalLockedUSDC ?? "0.00"}`} sub="in active milestones" color="indigo" />
              <StatTile label="Active"        value={String(dash?.activeCount ?? 0)}         sub="open projects"       color="emerald" />
              <StatTile label="Completed"     value={String(dash?.completedCount ?? 0)}       sub="fully released"      color="slate" />
              <StatTile label="Disputed"      value={String(dash?.disputedCount ?? 0)}        sub="pending mediator"    color="amber" />
            </>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Projects */}
          <div className="lg:col-span-2 space-y-6">
            <RoleSection
              title="Projects I'm Funding"
              icon="client"
              projects={clientProjects}
              isLoading={isLoading}
              emptyText="No escrows created yet."
              emptyHref="/create"
              emptyAction="Fund your first escrow"
            />
            <RoleSection
              title="Projects I'm Working On"
              icon="freelancer"
              projects={freelancerProjects}
              isLoading={isLoading}
              emptyText="You haven't been hired into an escrow yet."
              emptyHref="/jobs"
              emptyAction="Browse open jobs"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <p className="section-header">Recent Activity</p>
            <div className="card p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-2.5 bg-slate-100 rounded w-2/3" />
                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <TxLog activities={dash?.recentActivity ?? []} />
              )}
            </div>

            <p className="section-header pt-2">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/jobs/post"
                className="card p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-md transition-all group block">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">Post a Job</p>
                  <p className="text-xs text-slate-400">Find and hire talent</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/jobs"
                className="card p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-md transition-all group block">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">Find Work</p>
                  <p className="text-xs text-slate-400">Browse open jobs</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

      </main>
    </>
  );
};

// ─── Role section ──────────────────────────────────────────────────────────────
function RoleSection({ title, icon, projects, isLoading, emptyText, emptyHref, emptyAction }: {
  title: string; icon: "client" | "freelancer";
  projects: EscrowProject[]; isLoading: boolean;
  emptyText: string; emptyHref: string; emptyAction: string;
}) {
  const color = icon === "client" ? "indigo" : "emerald";
  const iconBg   = color === "indigo" ? "bg-indigo-100" : "bg-emerald-100";
  const iconText = color === "indigo" ? "text-indigo-600" : "text-emerald-600";
  const badge    = color === "indigo" ? "badge-blue" : "badge-green";

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${iconBg}`}>
          <svg className={`w-3 h-3 ${iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon === "client" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            )}
          </svg>
        </div>
        <p className="section-header mb-0">{title}</p>
        {!isLoading && projects.length > 0 && (
          <span className={`badge ${badge} ml-auto`}>{projects.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="card p-5 animate-pulse h-20" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">{emptyText}</p>
          <Link href={emptyHref} className="btn-secondary text-xs shrink-0">{emptyAction}</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => <ProjectRow key={p.id} project={p} />)}
        </div>
      )}
    </section>
  );
}

// ─── Project row ───────────────────────────────────────────────────────────────
function ProjectRow({ project }: { project: EscrowProject }) {
  const released = project.milestones.filter((m) => m.status === "RELEASED").length;
  const total    = project.milestones.length;
  const pct      = total > 0 ? Math.round((released / total) * 100) : 0;

  const statusBadge =
    project.status === "COMPLETED" ? "badge-green" :
    project.status === "DISPUTED"  ? "badge-red"   : "badge-blue";

  const barColor =
    project.status === "DISPUTED"  ? "bg-red-400"     :
    project.status === "COMPLETED" ? "bg-emerald-500" : "bg-indigo-500";

  return (
    <Link href={`/escrow/${project.escrowAddress}`}
      className="card p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-md transition-all group block">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-slate-800 text-sm group-hover:text-slate-900 truncate">
            {project.title ?? `${project.escrowAddress.slice(0, 10)}…`}
          </p>
          <span className={`badge ${statusBadge} shrink-0`}>{project.status}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">{released}/{total} milestones</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-700 tabular-nums">
          {project.totalAmount
            ? `$${parseFloat(project.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : "—"}
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          {project.escrowAddress.slice(0, 6)}…{project.escrowAddress.slice(-4)}
        </p>
      </div>
    </Link>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, sub, color, href }: {
  label: string; value: string; sub?: string;
  color: "indigo" | "emerald" | "amber" | "slate"; href?: string;
}) {
  const val: Record<string, string> = {
    indigo:  "text-indigo-600",
    emerald: "text-emerald-600",
    amber:   "text-amber-600",
    slate:   "text-slate-700",
  };
  const inner = (
    <div className="card p-4 space-y-0.5">
      <p className={`text-xl font-bold tabular-nums ${val[color]}`}>{value}</p>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Landing page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const { connect, connectors } = useWallet();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
          <div className="max-w-4xl mx-auto px-4 py-28 text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live on Polygon Mumbai Testnet
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Milestone escrow for<br />
              <span className="text-indigo-200">freelancers &amp; clients</span>
            </h1>
            <p className="text-indigo-100 text-lg max-w-xl mx-auto">
              Lock USDC on-chain. Release per agreed milestone.
              No middleman — just smart contracts and trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => connect({ connector: c })}
                  className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  <ConnectorDot name={c.name} />
                  Connect with {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-indigo-300">Non-custodial · Your keys, your funds</p>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-center text-xl font-bold text-slate-900 mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: "1", color: "indigo",  title: "Post a Job",        desc: "Describe the work, set a budget, collect freelancer applications. Shortlist your top candidates.", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
              { step: "2", color: "purple",  title: "Lock Funds",        desc: "Choose your freelancer, define milestones with USDC amounts and deadlines, lock on-chain.",     icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
              { step: "3", color: "emerald", title: "Release Per Stage", desc: "Freelancer marks delivered. Client approves. USDC releases instantly. No trust required.",       icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map((f) => (
              <div key={f.step} className="card p-6 space-y-4">
                <div className={`w-11 h-11 rounded-xl bg-${f.color}-100 flex items-center justify-center`}>
                  <svg className={`w-5 h-5 text-${f.color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <div>
                  <p className={`text-xs font-bold text-${f.color}-500 uppercase tracking-widest mb-1`}>Step {f.step}</p>
                  <h3 className="font-bold text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats strip */}
        <section className="bg-slate-900 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-6 text-center">
            {[
              { label: "Payment Token", value: "USDC"     },
              { label: "Settlement",    value: "On-chain" },
              { label: "Network",       value: "Polygon"  },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl font-bold text-indigo-400">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function ConnectorDot({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("metamask") || lower.includes("injected"))
    return <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-700 text-xs font-bold flex items-center justify-center">M</span>;
  if (lower.includes("coinbase"))
    return <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">C</span>;
  return <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">W</span>;
}

export default Dashboard;
