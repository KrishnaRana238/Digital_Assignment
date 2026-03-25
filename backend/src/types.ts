export type UserRole = "subscriber" | "admin";
export type AccountType = "individual" | "team" | "corporate";
export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "inactive" | "cancelled" | "lapsed";
export type DrawMode = "random" | "algorithmic";
export type DrawStatus = "draft" | "simulated" | "published";
export type CampaignStatus = "draft" | "active" | "archived";
export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";
export type PayoutStatus = "pending" | "paid";
export type DonationKind = "subscription" | "independent";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: string | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountType: AccountType;
  countryCode: string;
  organizationName: string | null;
  selectedCharityId: string;
  charityPercentage: number;
  createdAt: string;
  subscription: SubscriptionInfo;
}

export interface Score {
  id: string;
  userId: string;
  value: number;
  playedAt: string;
  createdAt: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  galleryImages: string[];
  upcomingEvent: string;
  featured: boolean;
  countryCode: string;
}

export interface Draw {
  id: string;
  monthKey: string;
  monthLabel: string;
  scheduledFor: string;
  mode: DrawMode;
  status: DrawStatus;
  carryOver: number;
  simulationNumbers: number[] | null;
  numbers: number[] | null;
  prizePoolTotal: number;
  winnerIds: string[];
  simulatedAt: string | null;
  publishedAt: string | null;
}

export interface DrawEntry {
  id: string;
  drawId: string;
  userId: string;
  numbers: number[];
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: CampaignStatus;
  targetAmount: number;
  linkedCharityIds: string[];
  countryCode: string;
  createdAt: string;
  startsAt: string;
  endsAt: string | null;
}

export interface Winner {
  id: string;
  drawId: string;
  userId: string;
  matchCount: 3 | 4 | 5;
  prizeAmount: number;
  proofUrl: string | null;
  verificationStatus: VerificationStatus;
  payoutStatus: PayoutStatus;
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface Donation {
  id: string;
  charityId: string;
  userId: string | null;
  amount: number;
  donorName: string;
  donorEmail: string | null;
  kind: DonationKind;
  referenceId: string | null;
  createdAt: string;
}

export interface DataStore {
  users: User[];
  scores: Score[];
  charities: Charity[];
  campaigns: Campaign[];
  draws: Draw[];
  entries: DrawEntry[];
  winners: Winner[];
  donations: Donation[];
}

export interface SessionPayload {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
}
