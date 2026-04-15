import type { NextPage } from "next";
import Link from "next/link";
import { useState } from "react";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { Navbar } from "../../components/Navbar";
import { useJobs, type Job } from "../../hooks/useJobs";
import { FeeTag } from "../../components/FeeBreakdown";

const Dashboard: NextPage = () => {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { isConnected } = useActiveAddress();
  const { data, isLoading } = useJobs(query || undefined);
  const jobs = data?.jobs ?? [];

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Board</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Find freelance work or hire talent
            </p>
          </div>
          {isConnected && (
            <Link href="/jobs/post" className="btn-primary shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a Job
            </Link>
          )}
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => { e.preventDefault(); setQuery(search); }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Search jobs by title or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1"
          />
          <button type="submit" className="btn-secondary px-5">Search</button>
          {query && (
            <button type="button" onClick={() => { setSearch(""); setQuery(""); }}
              className="btn-outline px-4">Clear</button>
          )}
        </form>

        {/* List */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : jobs.length === 0 ? (
          <EmptyState hasQuery={!!query} />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">{jobs.length} open listing{jobs.length !== 1 ? "s" : ""}</p>
            {jobs.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </main>
    </>
  );
};

function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="card p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
              {job.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {job.client.walletAddress.slice(0, 6)}…{job.client.walletAddress.slice(-4)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="badge badge-blue">{job.budget} USDC</span>
            <FeeTag amount={job.budget} mode="client" />
          </div>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2">{job.description}</p>

        <div className="flex items-center gap-3 flex-wrap">
          {job.skills.slice(0, 5).map((s) => (
            <span key={s} className="badge badge-gray">{s}</span>
          ))}
          {job.skills.length > 5 && (
            <span className="text-xs text-slate-400">+{job.skills.length - 5} more</span>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {job._count?.applications ?? 0} applicant{job._count?.applications !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="card p-12 text-center space-y-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-slate-700">
          {hasQuery ? "No jobs match your search" : "No open jobs yet"}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          {hasQuery ? "Try different keywords." : "Be the first to post one."}
        </p>
      </div>
      {!hasQuery && (
        <Link href="/jobs/post" className="btn-primary inline-flex">Post the first job</Link>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
