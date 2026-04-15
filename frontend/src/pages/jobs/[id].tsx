import type { NextPage } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../../components/Navbar";
import {
  useJob,
  useApplyToJob,
  useUpdateApplicationStatus,
  type Application,
} from "../../hooks/useJobs";

const JobDetail: NextPage = () => {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : undefined;
  const { address, isConnected } = useAccount();
  const { data, isLoading } = useJob(id);
  const job = data?.job;

  const isClient =
    !!address && !!job?.client.walletAddress &&
    address.toLowerCase() === job.client.walletAddress.toLowerCase();

  const alreadyApplied = !!address && !!job?.applications?.some(
    (a) => a.freelancer.walletAddress.toLowerCase() === address.toLowerCase()
  );

  if (isLoading) return <LoadingScreen />;
  if (!job) return <NotFound />;

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

          {/* Client: link to create escrow when hiring */}
          {isClient && job.status === "IN_PROGRESS" && job.escrowAddress && (
            <Link
              href={`/escrow/${job.escrowAddress}`}
              className="btn-primary inline-flex mt-2"
            >
              View Escrow
            </Link>
          )}
        </div>

        {/* Apply form — freelancer only, job must be open */}
        {!isClient && job.status === "OPEN" && (
          <ApplySection
            jobId={job.id}
            isConnected={isConnected}
            address={address}
            alreadyApplied={alreadyApplied}
          />
        )}

        {/* Applications — visible to client */}
        {isClient && (
          <ApplicationsSection
            jobId={job.id}
            applications={job.applications ?? []}
            jobStatus={job.status}
            budget={job.budget}
            isClient={isClient}
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

// ── Apply Section ─────────────────────────────────────────────────────────────

function ApplySection({
  jobId,
  isConnected,
  address,
  alreadyApplied,
}: {
  jobId: string;
  isConnected: boolean;
  address?: string;
  alreadyApplied: boolean;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { mutateAsync: apply, isPending } = useApplyToJob();

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
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Application submitted</p>
          <p className="text-xs text-slate-400 mt-0.5">The client will review your application.</p>
        </div>
      </div>
    );
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError("");
    try {
      await apply({ jobId, freelancerWallet: address, coverLetter });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit application");
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-semibold text-slate-900">Apply for this Job</h2>
      <form onSubmit={handleApply} className="space-y-4">
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

function ApplicationsSection({
  jobId,
  applications,
  jobStatus,
  budget,
  isClient,
  clientWallet,
}: {
  jobId: string;
  applications: Application[];
  jobStatus: string;
  budget: string;
  isClient: boolean;
  clientWallet: string;
}) {
  const shortlisted = applications.filter((a) => a.status === "SHORTLISTED");
  const others = applications.filter((a) => a.status !== "SHORTLISTED");

  if (applications.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="font-semibold text-slate-700">No applications yet</p>
        <p className="text-sm text-slate-400">Check back later — applicants will appear here.</p>
      </div>
    );
  }

  const cardProps = { jobId, jobStatus, budget, isClient, clientWallet };

  return (
    <div className="space-y-4">
      {shortlisted.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            Shortlisted
            <span className="badge badge-green">{shortlisted.length}/3</span>
          </h2>
          {shortlisted.map((app) => (
            <ApplicationCard key={app.id} application={app} {...cardProps} />
          ))}
        </div>
      )}
      <div className="space-y-2">
        <h2 className="font-semibold text-slate-900">
          {shortlisted.length > 0 ? "All Applications" : `${applications.length} Application${applications.length !== 1 ? "s" : ""}`}
        </h2>
        {others.map((app) => (
          <ApplicationCard key={app.id} application={app} {...cardProps} />
        ))}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "badge-gray",
  SHORTLISTED: "badge-green",
  REJECTED: "badge-red",
  HIRED: "badge-blue",
};

function ApplicationCard({
  application,
  jobId,
  jobStatus,
  budget,
  isClient,
  clientWallet,
}: {
  application: Application;
  jobId: string;
  jobStatus: string;
  budget: string;
  isClient: boolean;
  clientWallet: string;
}) {
  const wallet = application.freelancer.walletAddress;
  const hireHref = `/create?freelancer=${wallet}&budget=${encodeURIComponent(budget)}&jobId=${jobId}`;
  const { mutate: updateStatus, isPending } = useUpdateApplicationStatus();

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/profile/${wallet}`}
            className="font-medium text-slate-800 text-sm font-mono hover:text-blue-600 transition-colors"
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
          {isClient && jobStatus === "OPEN" && application.status === "PENDING" && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => updateStatus({ jobId, appId: application.id, status: "SHORTLISTED", clientWallet })}
                className="btn-success text-xs px-3 py-1"
              >
                Shortlist
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => updateStatus({ jobId, appId: application.id, status: "REJECTED", clientWallet })}
                className="btn-outline text-xs px-3 py-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                Reject
              </button>
            </>
          )}
          {isClient && jobStatus === "OPEN" && application.status === "SHORTLISTED" && (
            <Link href={hireHref} className="btn-primary text-xs px-3 py-1">
              Hire
            </Link>
          )}
        </div>
      </div>
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
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{application.coverLetter}</p>
    </div>
  );
}

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
