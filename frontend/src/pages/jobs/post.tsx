import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useState, KeyboardEvent } from "react";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { Navbar } from "../../components/Navbar";
import { usePostJob } from "../../hooks/useJobs";
import { FeeBreakdown } from "../../components/FeeBreakdown";

const PostJob: NextPage = () => {
  const router = useRouter();
  const { address, isConnected } = useActiveAddress();
  const { mutateAsync: postJob, isPending } = usePostJob();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState("");

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  function onSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError("");
    try {
      const { job } = await postJob({
        clientWallet: address,
        title,
        description,
        budget,
        skills,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      router.push(`/jobs/${job.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to post job");
    }
  }

  if (!isConnected) {
    return (
      <>
        <Navbar backHref="/jobs" backLabel="Job Board" />
        <main className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <p className="font-semibold text-slate-700">Connect your wallet to post a job</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar backHref="/jobs" backLabel="Job Board" />
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="card p-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Post a Job</h1>
            <p className="text-sm text-slate-500 mt-0.5">Fill in the details to find the right freelancer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="label" htmlFor="title">Job Title</label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder="e.g. Smart contract audit for DeFi protocol"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="input min-h-[120px] resize-y"
                placeholder="Describe the work, requirements, timeline, and deliverables…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
              />
            </div>

            {/* Budget */}
            <div>
              <label className="label" htmlFor="budget">Budget (USDC)</label>
              <div className="relative">
                <input
                  id="budget"
                  type="text"
                  inputMode="decimal"
                  className="input pr-16"
                  placeholder="500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                  USDC
                </span>
              </div>
            </div>

            {/* Live fee preview */}
            {budget && parseFloat(budget) > 0 && (
              <FeeBreakdown amount={budget} mode="client" />
            )}

            {/* Deadline */}
            <div>
              <label className="label" htmlFor="deadline">Project Deadline</label>
              <input
                id="deadline"
                type="date"
                className="input"
                min={new Date().toISOString().split("T")[0]}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Optional — helps freelancers understand urgency</p>
            </div>

            {/* Skills */}
            <div>
              <label className="label">Required Skills</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Type a skill and press Enter"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={onSkillKeyDown}
                />
                <button type="button" onClick={addSkill} className="btn-secondary px-4">
                  Add
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="badge badge-blue flex items-center gap-1.5 pr-1"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(s)}
                        className="hover:text-blue-900 leading-none"
                        aria-label={`Remove skill ${s}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? "Posting…" : "Post Job"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
};

export default PostJob;
