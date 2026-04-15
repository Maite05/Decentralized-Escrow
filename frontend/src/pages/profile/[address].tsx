import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { Navbar } from "../../components/Navbar";
import {
  useFreelancerProfile,
  useUpdateProfile,
  useAddPortfolioItem,
  useDeletePortfolioItem,
  type FreelancerProfile,
  type PortfolioItem,
} from "../../hooks/useJobs";

const AVAILABILITY_OPTS = [
  { value: "AVAILABLE",   label: "Available",   cls: "badge-green"  },
  { value: "BUSY",        label: "Busy",         cls: "badge-yellow" },
  { value: "UNAVAILABLE", label: "Unavailable", cls: "badge-gray"   },
] as const;

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const address =
    typeof router.query.address === "string"
      ? router.query.address.toLowerCase()
      : undefined;

  const [mounted, setMounted] = useState(false);
  const { address: connectedAddress } = useActiveAddress();

  useEffect(() => { setMounted(true); }, []);

  // Only compute isOwner after client-side hydration to avoid server/client mismatch.
  const isOwner =
    mounted && !!connectedAddress && !!address &&
    connectedAddress.toLowerCase() === address;

  const { data, isLoading } = useFreelancerProfile(address);
  const profile = data?.user;

  if (isLoading) return <LoadingScreen />;
  if (!profile && !isOwner) return <NotFound />;

  return (
    <>
      <Navbar backHref="/talent" backLabel="Talent" />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <ProfileHeader profile={profile} address={address!} isOwner={isOwner} />
        <PortfolioSection
          items={profile?.portfolioItems ?? []}
          isOwner={isOwner}
          ownerAddress={connectedAddress}
        />
        {isOwner && <EditProfileForm address={connectedAddress!} profile={profile} />}
      </main>
    </>
  );
};

// ── Profile Header ─────────────────────────────────────────────────────────────

function ProfileHeader({
  profile,
  address,
  isOwner,
}: {
  profile?: FreelancerProfile;
  address: string;
  isOwner: boolean;
}) {
  const avail = AVAILABILITY_OPTS.find((o) => o.value === (profile?.availability ?? "AVAILABLE"));

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 text-white font-bold text-xl">
          {(profile?.displayName ?? address).slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {profile?.displayName ? (
            <h1 className="font-bold text-slate-900 text-lg">{profile.displayName}</h1>
          ) : (
            <p className="font-mono text-sm text-slate-500">{address.slice(0, 6)}…{address.slice(-4)}</p>
          )}
          {profile?.tagline && (
            <p className="text-sm text-slate-600 mt-0.5">{profile.tagline}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="badge badge-blue text-xs">{profile?.role ?? "FREELANCER"}</span>
            {avail && (
              <span className={`badge ${avail.cls} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block opacity-70" />
                {avail.label}
              </span>
            )}
            {profile?.hourlyRate && (
              <span className="text-xs font-semibold text-slate-700">${profile.hourlyRate}/hr</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center border-t border-slate-100 pt-4">
        <div>
          <p className="font-bold text-slate-900">{profile?.completedProjects ?? 0}</p>
          <p className="text-xs text-slate-400 mt-0.5">Projects</p>
        </div>
        <div>
          <p className="font-bold text-slate-900">
            {profile?.rating != null ? profile.rating.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Rating</p>
        </div>
        <div>
          <p className="font-bold text-slate-900">
            {profile?.totalEarned ? `$${profile.totalEarned}` : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Earned</p>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio ? (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
      ) : isOwner ? (
        <p className="text-sm text-slate-400 italic">Add a bio below to help clients find you.</p>
      ) : (
        <p className="text-sm text-slate-400 italic">No bio yet.</p>
      )}

      {/* Skills */}
      {profile && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span key={s} className="badge badge-gray">{s}</span>
          ))}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-4 flex-wrap">
        {profile?.portfolioUrl && (
          <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Portfolio
          </a>
        )}
        <a
          href={`https://sepolia.etherscan.io/address/${address}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 font-mono transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Sepolia Etherscan
        </a>
      </div>
    </div>
  );
}

// ── Portfolio Section ──────────────────────────────────────────────────────────

function PortfolioSection({
  items,
  isOwner,
  ownerAddress,
}: {
  items: PortfolioItem[];
  isOwner: boolean;
  ownerAddress?: string;
}) {
  const [adding, setAdding] = useState(false);
  const { mutate: addItem, isPending: isAdding } = useAddPortfolioItem();
  const { mutate: deleteItem } = useDeletePortfolioItem();
  const [form, setForm] = useState({ title: "", description: "", projectUrl: "", imageUrl: "", tags: "" });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerAddress) return;
    addItem(
      {
        address: ownerAddress.toLowerCase(),
        title: form.title,
        description: form.description || undefined,
        projectUrl: form.projectUrl || undefined,
        imageUrl: form.imageUrl || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          setAdding(false);
          setForm({ title: "", description: "", projectUrl: "", imageUrl: "", tags: "" });
        },
      }
    );
  }

  if (items.length === 0 && !isOwner) return null;

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Portfolio</h2>
        {isOwner && (
          <button type="button" onClick={() => setAdding(!adding)} className="btn-outline text-xs px-3 py-1.5">
            {adding ? "Cancel" : "+ Add Work"}
          </button>
        )}
      </div>

      {isOwner && adding && (
        <form onSubmit={handleAdd} className="bg-slate-50 rounded-xl p-4 space-y-3">
          <input className="input text-sm" placeholder="Project title *" required
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input text-sm min-h-[72px] resize-none" placeholder="Short description…"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input text-sm" placeholder="Live URL (https://…)"
            value={form.projectUrl} onChange={(e) => setForm({ ...form, projectUrl: e.target.value })} />
          <input className="input text-sm" placeholder="Preview image URL (optional)"
            value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <input className="input text-sm" placeholder="Tags (comma-separated: React, DeFi, NFT)"
            value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <button type="submit" disabled={isAdding} className="btn-primary text-sm">
            {isAdding ? "Adding…" : "Add to Portfolio"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No portfolio items yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden group">
              {item.imageUrl && (
                <div className="h-32 bg-slate-100 overflow-hidden">
                  <img src={item.imageUrl} alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  {isOwner && ownerAddress && (
                    <button type="button"
                      onClick={() => deleteItem({ address: ownerAddress.toLowerCase(), itemId: item.id })}
                      className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Remove">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span key={t} className="badge badge-gray text-xs">{t}</span>
                    ))}
                  </div>
                )}
                {item.projectUrl && (
                  <a href={item.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View project
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit Profile Form ──────────────────────────────────────────────────────────

function EditProfileForm({
  address,
  profile,
}: {
  address: string;
  profile?: FreelancerProfile;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [tagline, setTagline] = useState(profile?.tagline ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? "");
  const [hourlyRate, setHourlyRate] = useState(profile?.hourlyRate ?? "");
  const [availability, setAvailability] = useState<"AVAILABLE" | "BUSY" | "UNAVAILABLE">(
    profile?.availability ?? "AVAILABLE"
  );
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [saved, setSaved] = useState(false);

  const { mutate, isPending } = useUpdateProfile();

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 20) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(
      { address: address.toLowerCase(), displayName, tagline, bio, skills, portfolioUrl, hourlyRate, availability },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); } },
    );
  };

  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-semibold text-slate-900">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="displayName">Display Name</label>
            <input id="displayName" type="text" className="input" maxLength={60}
              placeholder="e.g. Priya Sharma"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="hourlyRate">Hourly Rate (USDC)</label>
            <div className="relative">
              <input id="hourlyRate" type="text" inputMode="decimal" className="input pr-14"
                placeholder="75" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">/hr</span>
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tagline">Tagline</label>
          <input id="tagline" type="text" className="input" maxLength={120}
            placeholder="Full-stack Web3 developer specialising in DeFi protocols"
            value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>

        <div>
          <label className="label">Availability</label>
          <div className="flex gap-2 flex-wrap">
            {AVAILABILITY_OPTS.map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => setAvailability(opt.value)}
                className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                  availability === opt.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="bio">Bio</label>
          <textarea id="bio" className="input min-h-[100px] resize-y" maxLength={1000}
            placeholder="Describe your experience and what you specialise in…"
            value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="text-xs text-slate-400 text-right mt-0.5">{bio.length}/1000</p>
        </div>

        <div>
          <label className="label">Skills</label>
          <div className="flex gap-2">
            <input type="text" className="input flex-1" placeholder="e.g. Solidity, React, Python…"
              value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
            <button type="button" onClick={addSkill} className="btn-secondary px-4">Add</button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {skills.map((s) => (
                <span key={s} className="badge badge-gray flex items-center gap-1 cursor-pointer"
                  onClick={() => removeSkill(s)}>
                  {s}
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="portfolio">Portfolio / GitHub URL</label>
          <input id="portfolio" type="url" className="input"
            placeholder="https://github.com/yourname"
            value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Saving…" : "Save Profile"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
        </div>
      </form>
    </div>
  );
}

// ── Utility screens ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <>
      <Navbar backHref="/talent" backLabel="Talent" />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="card p-6 animate-pulse space-y-3">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-full" />
        </div>
      </main>
    </>
  );
}

function NotFound() {
  return (
    <>
      <Navbar backHref="/talent" backLabel="Talent" />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
        <p className="font-semibold text-slate-700">Profile not found</p>
        <p className="text-sm text-slate-400">This wallet hasn't created a profile yet.</p>
      </main>
    </>
  );
}

export default ProfilePage;
