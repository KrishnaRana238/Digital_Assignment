import "server-only";
import type { AdminDashboard, Charity, Draw, MemberDashboard, PublicOverview, SessionProfile, UserSummary } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const overviewFallback: PublicOverview = {
  stats: {
    activeSubscribers: 0,
    totalCharityRaised: 0,
    currentPrizePool: 0,
    currentCarryOver: 0,
  },
  currentDraw: {
    id: "fallback-draw",
    monthLabel: "Current Month",
    status: "draft",
    mode: "random",
    carryOver: 0,
    prizePoolTotal: 0,
    simulatedNumbers: null,
  },
  featuredCharities: [],
  featuredCampaigns: [],
  featuredWinners: [],
  pricing: {
    monthly: 29,
    yearly: 299,
    charityMinimumPercent: 0.1,
  },
  billing: {
    stripeConfigured: false,
  },
};

async function handleResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Something went wrong while talking to the backend.");
  }

  return payload as T;
}

export async function requestBackend<T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
) {
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  return handleResponse<T>(response);
}

export async function getPublicOverview() {
  try {
    return await requestBackend<PublicOverview>("/api/public/overview");
  } catch {
    return overviewFallback;
  }
}

export async function getPublicCharities() {
  try {
    return await requestBackend<Charity[]>("/api/public/charities");
  } catch {
    return [];
  }
}

export async function getPublicDraws() {
  try {
    return await requestBackend<Draw[]>("/api/public/draws");
  } catch {
    return [];
  }
}

export async function getMemberDashboard(token: string) {
  return requestBackend<MemberDashboard>("/api/me/dashboard", undefined, token);
}

export async function getAdminDashboard(token: string) {
  return requestBackend<AdminDashboard>("/api/admin/dashboard", undefined, token);
}

export interface AuthResponse {
  token: string;
  user: UserSummary;
}

export function toSessionProfile(user: UserSummary): SessionProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
