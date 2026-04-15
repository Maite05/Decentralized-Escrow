import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch } from "../lib/api";
import type { DashboardSummary, EscrowProject, AiRiskResponse } from "../lib/api";

export type ApplicationStatus = "PENDING" | "SHORTLISTED" | "REJECTED" | "HIRED";

export interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  skills: string[];
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  escrowAddress?: string;
  deadline?: string;
  createdAt: string;
  client: { walletAddress: string };
  _count?: { applications: number };
}

export interface Application {
  id: string;
  jobId: string;
  coverLetter: string;
  status: ApplicationStatus;
  createdAt: string;
  freelancer: { walletAddress: string; bio?: string; skills?: string[]; portfolioUrl?: string };
}

export interface JobDetail extends Job {
  applications: Application[];
}

export interface FreelancerProfile {
  id: string;
  walletAddress: string;
  role: string;
  bio?: string;
  skills: string[];
  portfolioUrl?: string;
  createdAt: string;
  _count?: { freelancerProjects: number; applications: number };
}

export function useJobs(search?: string) {
  return useQuery<{ jobs: Job[]; total: number }>({
    queryKey: ["jobs", search],
    queryFn: () => get(`/jobs${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    staleTime: 30_000,
  });
}

export function useJob(id: string | undefined) {
  return useQuery<{ job: JobDetail }>({
    queryKey: ["job", id],
    queryFn: () => get(`/jobs/${id}`),
    enabled: !!id,
  });
}

export function useFreelancerProfile(address: string | undefined) {
  return useQuery<{ user: FreelancerProfile }>({
    queryKey: ["profile", address],
    queryFn: () => get(`/auth/profile/${address}`),
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientWallet: string;
      title: string;
      description: string;
      budget: string;
      skills: string[];
      deadline?: string;
    }) => post<{ job: Job }>("/jobs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...body }: {
      jobId: string;
      freelancerWallet: string;
      coverLetter: string;
    }) => post<{ application: Application }>(`/jobs/${jobId}/apply`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["job", vars.jobId] }),
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, appId, status, clientWallet }: {
      jobId: string;
      appId: string;
      status: "SHORTLISTED" | "REJECTED";
      clientWallet: string;
    }) =>
      patch<{ application: Application }>(
        `/jobs/${jobId}/applications/${appId}`,
        { status, clientWallet },
      ),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["job", vars.jobId] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ address, ...body }: {
      address: string;
      bio?: string;
      skills?: string[];
      portfolioUrl?: string;
      email?: string;
    }) => patch<{ user: FreelancerProfile }>(`/auth/profile/${address}`, body),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["profile", vars.address] }),
  });
}

export function useHireFreelancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...body }: {
      jobId: string;
      freelancerWallet: string;
      escrowAddress: string;
      deadline?: string;
    }) => post<{ job: Job }>(`/jobs/${jobId}/hire`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["job", vars.jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

// ─── Escrow / Dashboard hooks ─────────────────────────────────────────────────

export function useDashboard(wallet: string | undefined) {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", wallet],
    queryFn: () => get<DashboardSummary>(`/escrow/dashboard/${wallet}`),
    enabled: !!wallet,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useEscrowProjects(wallet: string | undefined) {
  return useQuery<{ projects: EscrowProject[]; total: number }>({
    queryKey: ["escrow-projects", wallet],
    queryFn: () => get<{ projects: EscrowProject[]; total: number }>(`/escrow/projects/${wallet}`),
    enabled: !!wallet,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useAiRisk(projectId: string | undefined) {
  return useQuery<AiRiskResponse>({
    queryKey: ["ai-risk", projectId],
    queryFn: () => get<AiRiskResponse>(`/escrow/ai/risk/${projectId}`),
    enabled: !!projectId,
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: false,
  });
}
