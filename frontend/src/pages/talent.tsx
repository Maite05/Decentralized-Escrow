import type { NextPage } from "next";
import Link from "next/link";
import { useState } from "react";
import { useActiveAddress } from "../hooks/useActiveAddress";
import { Navbar } from "../components/Navbar";
import { useTalentProfiles, type FreelancerProfile } from "../hooks/useJobs";

const AVAILABILITY_STYLES = {
  AVAILABLE:   { badge: "badge-green",  label: "Available",   dot: "bg-emerald-500" },
  BUSY:        { badge: "badge-yellow", label: "Busy",         dot: "bg-amber-400" },
  UNAVAILABLE: { badge: "badge-gray",   label: "Unavailable", dot: "bg-slate-300" },
};

const SKILLS_FILTER = [
  "Solidity", "React", "TypeScript", "Python", "Rust", "Node.js",
  "Web3.js", "Ethers.js", "Smart Contracts", "DeFi", "NFT", "UI/UX",
];

const TalentMarketplace: NextPage = () => {
  const { address, isConnected } = useActiveAddress();
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [availFilter, setAvailFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useTalentProfiles({
    search: debouncedSearch || undefined,
    skill: skillFilter || undefined,
    availability: availFilter || undefined,
  });

  const profiles = data?.profiles ?? [];

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(val), 300);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">Talent Marketplace</h1>
            <p className="text-sm text-slate-500">Find verified Web3 freelancers for your project</p>
          </div>
          {isConnected && address && (
            <Link
              href={`/profile/${address.toLowerCase()}`}
              className="btn-primary shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              My Profile
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="input pl-9"
                placeholder="Search by name, tagline, or bio…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <select
              className="input sm:w-44"
              value={availFilter}
              onChange={(e) => setAvailFilter(e.target.value)}
            >
              <option value="">All availability</option>
              <option value="AVAILABLE">Available now</option>
              <option value="BUSY">Busy</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>

          {/* Skill chips */}
          <div className="flex flex-wrap gap-2">
            {SKILLS_FILTER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSkillFilter(skillFilter === s ? "" : s)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  skillFilter === s
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {s}
              </button>
            ))}
            {skillFilter && (
              <button
                type="button"
                onClick={() => setSkillFilter("")}
                className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="card p-12 text-center space-y-2">
            <p className="font-semibold text-slate-700">No freelancers found</p>
            <p className="text-sm text-slate-400">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400">{profiles.length} freelancer{profiles.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p) => (
                <ProfileCard key={p.id} profile={p} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
};

function ProfileCard({ profile }: { profile: FreelancerProfile }) {
  const avail = AVAILABILITY_STYLES[profile.availability ?? "AVAILABLE"];
  const initials = profile.displayName
    ? profile.displayName.slice(0, 2).toUpperCase()
    : profile.walletAddress.slice(2, 4).toUpperCase();

  return (
    <Link href={`/profile/${profile.walletAddress}`} className="card p-5 space-y-3 hover:shadow-md hover:border-indigo-200 transition-all block group">

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 text-white font-bold text-base">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
            {profile.displayName ?? `${profile.walletAddress.slice(0, 6)}…${profile.walletAddress.slice(-4)}`}
          </p>
          {profile.tagline && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{profile.tagline}</p>
          )}
        </div>
        <span className={`badge ${avail.badge} shrink-0 flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${avail.dot} inline-block`} />
          {avail.label}
        </span>
      </div>

      {/* Bio snippet */}
      {profile.bio && (
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{profile.bio}</p>
      )}

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.slice(0, 5).map((s) => (
            <span key={s} className="badge badge-gray text-xs">{s}</span>
          ))}
          {profile.skills.length > 5 && (
            <span className="text-xs text-slate-400">+{profile.skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
        {profile.hourlyRate && (
          <span className="font-semibold text-slate-700">${profile.hourlyRate}/hr</span>
        )}
        {(profile.completedProjects ?? 0) > 0 && (
          <span>{profile.completedProjects} project{profile.completedProjects !== 1 ? "s" : ""}</span>
        )}
        {profile.rating != null && (
          <span className="flex items-center gap-0.5">
            <svg className="w-3 h-3 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
            {profile.rating.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default TalentMarketplace;
