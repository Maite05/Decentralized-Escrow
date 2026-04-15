const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Dashboard / Escrow project types ──────────────────────────────────────

export interface ActivityItem {
  type: string;
  projectId: string;
  escrowAddress: string;
  description: string;
  timestamp: string;
  txHash: string | null;
}

export interface EscrowMilestone {
  id: string;
  milestoneIndex: number;
  description: string;
  amount: string;
  status: "LOCKED" | "DELIVERED" | "RELEASED" | "DISPUTED" | "REFUNDED";
  clientApproved: boolean;
  freelancerDelivered: boolean;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EscrowProject {
  id: string;
  escrowAddress: string;
  status: "ACTIVE" | "COMPLETED" | "DISPUTED";
  totalAmount?: string;
  title?: string;
  description?: string;
  mediatorAddress?: string;
  freelancerAccepted: boolean;
  deadline?: string;
  client: { id: string; walletAddress: string };
  freelancer: { id: string; walletAddress: string };
  milestones: EscrowMilestone[];
  dispute?: { id: string; status: string; reason?: string } | null;
  _count?: { milestones: number };
  createdAt: string;
}

export interface DashboardSummary {
  totalLockedUSDC: string;
  activeCount: number;
  completedCount: number;
  disputedCount: number;
  asClientTotal: number;
  asFreelancerTotal: number;
  recentActivity: ActivityItem[];
  projects: EscrowProject[];
}

// ─── AI Risk types ──────────────────────────────────────────────────────────

export interface RiskSignal {
  type: string;
  confidence: number;
  description: string;
}

export interface AiRiskResponse {
  score: number;
  signals: RiskSignal[];
  suggestion: string;
  projectId?: string;
  escrowAddress?: string;
  assessedAt?: string;
}

/** Fallback shown in AIInsightPanel when the backend is unreachable. */
export const MOCK_INSIGHT = {
  risk: "Unknown",
  summary:
    "AI insight backend is not configured. Set NEXT_PUBLIC_API_URL in .env to enable live risk analysis.",
};

/** Shape of the x402 payment requirements returned in the X-Payment-Required header. */
export interface X402PaymentRequired {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: `0x${string}`;
  asset: `0x${string}`;
  extra?: { name: string; decimals: number };
}

/** Thrown by get() when the server returns HTTP 402 Payment Required. */
export class PaymentRequiredError extends Error {
  requirements: X402PaymentRequired;

  constructor(requirements: X402PaymentRequired) {
    super("Payment required");
    this.name = "PaymentRequiredError";
    this.requirements = requirements;
  }
}

/**
 * Performs a GET request to the backend API.
 *
 * @param path    - Relative path including leading slash, e.g. `/escrow/ai/risk/0x123`.
 * @param headers - Optional extra headers (e.g. `{ "X-Payment": "<base64 proof>" }`).
 * @throws {PaymentRequiredError} when the server responds with 402.
 */
export async function get<T>(
  path: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...headers },
  });

  if (res.status === 402) {
    const raw = res.headers.get("X-Payment-Required");
    if (raw) {
      const requirements = JSON.parse(atob(raw)) as X402PaymentRequired;
      throw new PaymentRequiredError(requirements);
    }
    throw new Error(`GET ${path} returned 402 without payment requirements`);
  }

  if (!res.ok) {
    throw new Error(`GET ${path} returned ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Performs a POST request to the backend API.
 * @param path - Relative path including leading slash.
 * @param body - JSON-serialisable request body.
 */
export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Performs a PATCH request to the backend API.
 */
export async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Performs a DELETE request to the backend API.
 */
export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`DELETE ${path} returned ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Encode a payment proof as the X-Payment header value. */
export function encodePaymentHeader(txHash: `0x${string}`, chainId: number): string {
  return btoa(JSON.stringify({ txHash, chainId }));
}
