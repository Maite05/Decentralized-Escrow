import type { NextPage } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { Navbar } from "../../components/Navbar";
import {
  useJob,
  useApplyToJob,
  useUpdateApplicationStatus,
  type Application,
  type ProposedMilestone,
} from "../../hooks/useJobs";

const JobDetail: NextPage = () => {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;
  const { address, isConnected } = useActiveAddress();
  const { data, isLoading } = useJob(id);
  const job = data?.job;

  const isClient =
    !!address && !!job?.client.walletAddress &&
    address.toLowerCase() === job.client.walletAddress.toLowerCase();

  const myApplication = job?.applications?.find(
    (a) => a.freelancer.walletAddress.toLowerCase() === (address ?? "").toLowerCase()
  );
  const alreadyApplied = !!myApplication;

  if (isLoading) return <LoadingScreen />;
  if (!job) return <NotFound />;

  // Workflow step indicator for the client
  const shortlistedCount = (job.applications ?? []).filter(
    (a) => a.status === "SHORTLISTED" || a.status === "INTERVIEWING"
  ).length;
  const interviewingCount = (job.applications ?? []).filter(
    (a) => a.status === "INTERVIEWING"
  ).length;
  const hiredApp = (job.applications ?? []).find((a) => a.status === "HIRED");

  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Posted by {job.client.walletAddress.slice(0, 6)}…{job.client.walletAddress.slice(-4)}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <span className="badge badge-blue text-sm px-3 py-1">{job.budget} USDC</span>
              <span className={`badge ${job.status === "OPEN" ? "badge-green" : job.status === "IN_PROGRESS" ? "badge-yellow" : "badge-gray"}`}>
                {job.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.description}</p>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {job.skills.map((s) => (
                <span key={s} className="badge badge-gray">{s}</span>
              ))}
            </div>
          )}

          {job.deadline && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </p>
          )}

          {isClient && job.status === "IN_PROGRESS" && job.escrowAddress && (
            <Link href={`/escrow/${job.escrowAddress}`} className="btn-primary inline-flex mt-2">
              View Escrow
            </Link>
          )}
        </div>

        {/* Client: hiring pipeline progress */}
        {isClient && job.status === "OPEN" && (
          <HiringPipeline
            totalApps={(job.applications ?? []).length}
            shortlistedCount={shortlistedCount}
            interviewingCount={interviewingCount}
          />
        )}

        {/* Apply form — freelancer only */}
        {!isClient && job.status === "OPEN" && (
          <ApplySection
            jobId={job.id}
            isConnected={isConnected}
            address={address}
            alreadyApplied={alreadyApplied}
            myApplication={myApplication}
          />
        )}

        {/* Freelancer: status of their application */}
        {!isClient && myApplication && (
          <ApplicationStatusBanner application={myApplication} />
        )}

        {/* Applications — visible to client */}
        {isClient && (
          <ApplicationsSection
            jobId={job.id}
            applications={job.applications ?? []}
            jobStatus={job.status}
            budget={job.budget}
            clientWallet={address ?? ""}
          />
        )}

        {/* Applicant count for freelancers */}
        {!isClient && (
          <p className="text-xs text-slate-400 text-center">
            {job._count?.applications ?? job.applications?.length ?? 0} applicant
            {(job._count?.applications ?? job.applications?.length ?? 0) !== 1 ? "s" : ""} so far
          </p>
        )}
      </main>
    </>
  );
};

// ── Hiring Pipeline ────────────────────────────────────────────────────────────

function HiringPipeline({
  totalApps,
  shortlistedCount,
  interviewingCount,
}: {
  totalApps: number;
  shortlistedCount: number;
  interviewingCount: number;
}) {
  const steps = [
    { label: "Applications received", value: totalApps, done: totalApps > 0 },
    { label: "Shortlisted (max 3)", value: shortlistedCount, done: shortlistedCount > 0 },
    { label: "Interviews scheduled", value: interviewingCount, done: interviewingCount > 0 },
    { label: "Hire & fund escrow", value: null, done: false },
  ];

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Hiring Pipeline</h2>
      <div className="flex items-start gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors
                ${step.done ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-400"}`}>
                {step.done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <p className="text-[10px] text-center mt-1.5 text-slate-500 leading-tight max-w-[68px]">
                {step.label}
                {step.value !== null && step.value > 0 && (
                  <span className="block font-semibold text-indigo-600">{step.value}</span>
                )}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${step.done ? "bg-indigo-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Apply Section ──────────────────────────────────────────────────────────────

function ApplySection({
  jobId,
  isConnected,
  address,
  alreadyApplied,
  myApplication,
}: {
  jobId: string;
  isConnected: boolean;
  address?: string;
  alreadyApplied: boolean;
  myApplication?: Application;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [milestones, setMilestones] = useState<ProposedMilestone[]>([]);
  const [showMilestones, setShowMilestones] = useState(false);
  const { mutateAsync: apply, isPending } = useApplyToJob();

  function addMilestone() {
    setMilestones((prev) => [...prev, { description: "", amount: "", dueDate: "" }]);
  }

  function updateMilestone(i: number, field: keyof ProposedMilestone, value: string) {
    setMilestones((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  function removeMilestone(i: number) {
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (!isConnected) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        Connect your wallet to apply for this job.
      </div>
    );
  }

  if (alreadyApplied || submitted) {
    return (
      <div className="card p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Application submitted</p>
          <p className="text-xs text-slate-400 mt-0.5">The client will review your proposal and may schedule an interview.</p>
        </div>
      </div>
    );
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError("");
    const validMilestones = milestones.filter((m) => m.description && m.amount);
    try {
      await apply({
        jobId,
        freelancerWallet: address,
        coverLetter,
        proposedMilestones: validMilestones.length > 0 ? validMilestones : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit application");
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-semibold text-slate-900">Apply for this Job</h2>
      <form onSubmit={handleApply} className="space-y-5">

        {/* Cover Letter */}
        <div>
          <label className="label" htmlFor="cover">Cover Letter</label>
          <textarea
            id="cover"
            className="input min-h-[120px] resize-y"
            placeholder="Introduce yourself and explain why you're the best fit…"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            required
            minLength={10}
          />
        </div>

        {/* Milestone Proposal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="label mb-0">Project Plan (optional)</p>
              <p className="text-xs text-slate-400">Break the work into stages with amounts — this becomes your milestone proposal.</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowMilestones(!showMilestones); if (!showMilestones && milestones.length === 0) addMilestone(); }}
              className="btn-outline text-xs px-3 py-1.5"
            >
              {showMilestones ? "Hide" : "Add Stages"}
            </button>
          </div>

          {showMilestones && (
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-50 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold shrink-0 mt-1">
                    {i + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="input col-span-2 text-sm py-1.5"
                      placeholder="Stage description (e.g. Design wireframes)"
                      value={m.description}
                      onChange={(e) => updateMilestone(i, "description", e.target.value)}
                    />
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="input text-sm py-1.5 pr-14"
                        placeholder="Amount"
                        value={m.amount}
                        onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">USDC</span>
                    </div>
                    <input
                      type="date"
                      className="input text-sm py-1.5"
                      value={m.dueDate ?? ""}
                      onChange={(e) => updateMilestone(i, "dueDate", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(i)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors mt-1"
                    aria-label="Remove stage"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMilestone}
                className="w-full border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 rounded-xl py-2.5 text-sm transition-colors"
              >
                + Add another stage
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
        )}
        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}

// ── Freelancer: status banner ──────────────────────────────────────────────────

function ApplicationStatusBanner({ application }: { application: Application }) {
  const configs: Record<string, { bg: string; icon: string; title: string; body: string }> = {
    PENDING:      { bg: "bg-slate-50 border-slate-200",     icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Under review", body: "The client is reviewing your application." },
    SHORTLISTED:  { bg: "bg-indigo-50 border-indigo-200",   icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "You've been shortlisted!", body: "The client is considering you. An interview may follow." },
    INTERVIEWING: { bg: "bg-amber-50 border-amber-200",     icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "Interview scheduled", body: application.interviewNote ?? "The client wants to interview you. Check for their contact details." },
    HIRED:        { bg: "bg-emerald-50 border-emerald-200", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", title: "You got the job!", body: "The client has hired you and is setting up the escrow." },
    REJECTED:     { bg: "bg-red-50 border-red-200",         icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z", title: "Not selected", body: "The client has gone with another candidate." },
  };

  const cfg = configs[application.status];
  if (!cfg) return null;

  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${cfg.bg}`}>
      <svg className="w-5 h-5 mt-0.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={cfg.icon} />
      </svg>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-slate-800">{cfg.title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{cfg.body}</p>
        {application.proposedMilestones && application.proposedMilestones.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your proposed stages</p>
            {application.proposedMilestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                <span className="flex-1">{m.description}</span>
                <span className="font-semibold text-slate-700">{m.amount} USDC</span>
                {m.dueDate && <span className="text-slate-400">by {new Date(m.dueDate).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Applications Section (client view) ────────────────────────────────────────

function ApplicationsSection({
  jobId,
  applications,
  jobStatus,
  budget,
  clientWallet,
}: {
  jobId: string;
  applications: Application[];
  jobStatus: string;
  budget: string;
  clientWallet: string;
}) {
  const interviewing = applications.filter((a) => a.status === "INTERVIEWING");
  const shortlisted  = applications.filter((a) => a.status === "SHORTLISTED");
  const others       = applications.filter((a) => !["SHORTLISTED", "INTERVIEWING"].includes(a.status));

  if (applications.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="font-semibold text-slate-700">No applications yet</p>
        <p className="text-sm text-slate-400">Check back later — applicants will appear here.</p>
      </div>
    );
  }

  const cardProps = { jobId, jobStatus, budget, clientWallet };
  const totalActive = shortlisted.length + interviewing.length;

  return (
    <div className="space-y-5">
      {interviewing.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            Interviewing
            <span className="badge badge-yellow">{interviewing.length}</span>
          </h2>
          {interviewing.map((app) => (
            <ApplicationCard key={app.id} application={app} {...cardProps} />
          ))}
        </section>
      )}

      {shortlisted.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            Shortlisted
            <span className="badge badge-green">{shortlisted.length}</span>
            <span className="text-xs font-normal text-slate-400">(move to interview or hire)</span>
          </h2>
          {shortlisted.map((app) => (
            <ApplicationCard key={app.id} application={app} {...cardProps} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          All Applications
          <span className="badge badge-gray">{applications.length}</span>
        </h2>
        {others.map((app) => (
          <ApplicationCard key={app.id} application={app} {...cardProps} />
        ))}
      </section>
    </div>
  );
}

// ── Application Card ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:      "badge-gray",
  SHORTLISTED:  "badge-green",
  INTERVIEWING: "badge-yellow",
  REJECTED:     "badge-red",
  HIRED:        "badge-blue",
};

function ApplicationCard({
  application,
  jobId,
  jobStatus,
  budget,
  clientWallet,
}: {
  application: Application;
  jobId: string;
  jobStatus: string;
  budget: string;
  clientWallet: string;
}) {
  const wallet = application.freelancer.walletAddress;
  const hireHref = `/create?freelancer=${wallet}&budget=${encodeURIComponent(budget)}&jobId=${jobId}`;
  const { mutate: updateStatus, isPending } = useUpdateApplicationStatus();

  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(application.interviewNote ?? "");

  function scheduleInterview() {
    updateStatus({ jobId, appId: application.id, status: "INTERVIEWING", clientWallet, interviewNote: note || undefined });
    setShowNote(false);
  }

  const canAct = jobStatus === "OPEN";
  const isPending_ = application.status === "PENDING";
  const isShortlisted = application.status === "SHORTLISTED";
  const isInterviewing = application.status === "INTERVIEWING";

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/profile/${wallet}`}
            className="font-medium text-slate-800 text-sm font-mono hover:text-indigo-600 transition-colors"
          >
            {wallet.slice(0, 6)}…{wallet.slice(-4)}
          </Link>
          <p className="text-xs text-slate-400 mt-0.5">
            Applied {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className={`badge ${STATUS_STYLES[application.status] ?? "badge-gray"}`}>
            {application.status}
          </span>

          {canAct && isPending_ && (
            <>
              <button type="button" disabled={isPending}
                onClick={() => updateStatus({ jobId, appId: application.id, status: "SHORTLISTED", clientWallet })}
                className="btn-success text-xs px-3 py-1">
                Shortlist
              </button>
              <button type="button" disabled={isPending}
                onClick={() => updateStatus({ jobId, appId: application.id, status: "REJECTED", clientWallet })}
                className="btn-outline text-xs px-3 py-1 text-red-600 border-red-200 hover:bg-red-50">
                Reject
              </button>
            </>
          )}

          {canAct && isShortlisted && (
            <>
              <button type="button" disabled={isPending}
                onClick={() => setShowNote(!showNote)}
                className="btn-outline text-xs px-3 py-1">
                Schedule Interview
              </button>
              <Link href={hireHref} className="btn-primary text-xs px-3 py-1">
                Hire
              </Link>
            </>
          )}

          {canAct && isInterviewing && (
            <Link href={hireHref} className="btn-primary text-xs px-3 py-1">
              Hire
            </Link>
          )}
        </div>
      </div>

      {/* Interview note input */}
      {showNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-800">Add interview details for the freelancer</p>
          <textarea
            className="input text-sm py-1.5 min-h-[72px] resize-none"
            placeholder="e.g. Video call on Friday at 2pm via Google Meet. Topic: review your proposed plan."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" onClick={scheduleInterview} disabled={isPending}
              className="btn-primary text-xs px-3 py-1.5">
              Confirm Interview
            </button>
            <button type="button" onClick={() => setShowNote(false)}
              className="btn-outline text-xs px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Interview note display */}
      {isInterviewing && application.interviewNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Interview note: </span>{application.interviewNote}
        </div>
      )}

      {/* Freelancer info */}
      {(application.freelancer.bio || (application.freelancer.skills ?? []).length > 0) && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {application.freelancer.bio && (
            <p className="text-xs text-slate-500 italic line-clamp-1 flex-1 min-w-0">
              {application.freelancer.bio}
            </p>
          )}
          {(application.freelancer.skills ?? []).slice(0, 4).map((s) => (
            <span key={s} className="badge badge-gray text-xs">{s}</span>
          ))}
        </div>
      )}

      {/* Cover letter */}
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{application.coverLetter}</p>

      {/* Proposed milestones */}
      {application.proposedMilestones && application.proposedMilestones.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Proposed project plan</p>
          <div className="space-y-1.5">
            {application.proposedMilestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 text-slate-700">{m.description}</span>
                <span className="font-semibold text-slate-800">{m.amount} USDC</span>
                {m.dueDate && (
                  <span className="text-slate-400">by {new Date(m.dueDate).toLocaleDateString()}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Utility screens ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div className="card p-6 animate-pulse space-y-3">
          <div className="h-6 bg-slate-100 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded w-full" />
          <div className="h-4 bg-slate-100 rounded w-3/4" />
        </div>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-3xl mx-auto px-4 py-20 text-center space-y-3">
        <p className="font-semibold text-slate-700">Job not found</p>
        <Link href="/jobs" className="btn-outline inline-flex">Back to Job Board</Link>
      </main>
    </>
  );
}

export default JobDetail;
