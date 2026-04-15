import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../lib/api";

export interface Job {
  id: string;
  title: string;
  description: string;
  budget: string;
  skills: string[];
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  escrowAddress?: string;
  createdAt: string;
  client: { walletAddress: string };
  _count?: { applications: number };
}

export interface Application {
  id: string;
  jobId: string;
  coverLetter: string;
  createdAt: string;
  freelancer: { walletAddress: string };
}

export interface JobDetail extends Job {
  applications: Application[];
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

export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientWallet: string;
      title: string;
      description: string;
      budget: string;
      skills: string[];
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

export function useHireFreelancer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, ...body }: {
      jobId: string;
      freelancerWallet: string;
      escrowAddress: string;
    }) => post<{ job: Job }>(`/jobs/${jobId}/hire`, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["job", vars.jobId] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
