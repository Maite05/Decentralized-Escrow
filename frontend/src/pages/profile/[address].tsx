import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Navbar } from "../../components/Navbar";
import {
  useFreelancerProfile,
  useUpdateProfile,
  type FreelancerProfile,
} from "../../hooks/useJobs";

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const address =
    typeof router.query.address === "string"
      ? router.query.address.toLowerCase()
      : undefined;

  const { address: connectedAddress } = useAccount();
  const isOwner =
    !!connectedAddress && !!address &&
    connectedAddress.toLowerCase() === address;

  const { data, isLoading } = useFreelancerProfile(address);
  const profile = data?.user;

  if (isLoading) return <LoadingScreen />;
  if (!profile && !isOwner) return <NotFound />;

  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <ProfileHeader profile={profile} address={address!} isOwner={isOwner} />
        {isOwner && <EditProfileForm address={connectedAddress!} profile={profile} />}
      </main>
    </>
  );
};

function ProfileHeader({
  profile,
  address,
  isOwner,
}: {
  profile?: FreelancerProfile;
  address: string;
  isOwner: boolean;
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">
            {address.slice(2, 4).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm text-slate-500">
            {address.slice(0, 6)}…{address.slice(-4)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-blue text-xs">
              {profile?.role ?? "FREELANCER"}
            </span>
            {profile?._count?.freelancerProjects != null && (
              <span className="text-xs text-slate-400">
                {profile._count.freelancerProjects} project
                {profile._count.freelancerProjects !== 1 ? "s" : ""} completed
              </span>
            )}
          </div>
        </div>
      </div>

      {profile?.bio ? (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.bio}</p>
      ) : isOwner ? (
        <p className="text-sm text-slate-400 italic">
          Add a bio below to help clients find you.
        </p>
      ) : (
        <p className="text-sm text-slate-400 italic">No bio yet.</p>
      )}

      {profile && profile.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((s) => (
            <span key={s} className="badge badge-gray">{s}</span>
          ))}
        </div>
      )}

      {profile?.portfolioUrl && (
        <a
          href={profile.portfolioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Portfolio
        </a>
      )}
    </div>
  );
}

function EditProfileForm({
  address,
  profile,
}: {
  address: string;
  profile?: FreelancerProfile;
}) {
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolioUrl ?? "");
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
      { address: address.toLowerCase(), bio, skills, portfolioUrl },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        },
      },
    );
  };

  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-semibold text-slate-900">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bio */}
        <div className="space-y-1.5">
          <label className="label" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            className="input min-h-[100px] resize-y"
            placeholder="Describe your experience and what you specialise in…"
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="text-xs text-slate-400 text-right">{bio.length}/500</p>
        </div>

        {/* Skills */}
        <div className="space-y-1.5">
          <label className="label">Skills</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="e.g. Solidity, React, Python…"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addSkill(); }
              }}
            />
            <button type="button" onClick={addSkill} className="btn-secondary px-4">
              Add
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {skills.map((s) => (
                <span
                  key={s}
                  className="badge badge-gray flex items-center gap-1 cursor-pointer"
                  onClick={() => removeSkill(s)}
                >
                  {s}
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Portfolio URL */}
        <div className="space-y-1.5">
          <label className="label" htmlFor="portfolio">Portfolio URL</label>
          <input
            id="portfolio"
            type="url"
            className="input"
            placeholder="https://github.com/yourname"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Saving…" : "Save Profile"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}

function LoadingScreen() {
  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        <div className="card p-6 animate-pulse space-y-3">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
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
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
        <p className="font-semibold text-slate-700">Profile not found</p>
        <p className="text-sm text-slate-400">This wallet hasn't created a profile yet.</p>
      </main>
    </>
  );
}

export default ProfilePage;
