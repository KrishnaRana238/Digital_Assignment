export type AccountType = "individual" | "team" | "corporate";

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
  raisedTotal?: number;
  subscriberCount?: number;
}

export interface SubscriptionInfo {
  plan: "monthly" | "yearly";
  status: "active" | "inactive" | "cancelled" | "lapsed";
  startedAt: string | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Score {
  id: string;
  value: number;
  playedAt: string;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: "subscriber" | "admin";
  accountType: AccountType;
  countryCode: string;
  organizationName: string | null;
  charityPercentage: number;
  createdAt: string;
  subscription: SubscriptionInfo;
  selectedCharity?: Charity;
  latestScores?: Score[];
  totalWon?: number;
}

export interface Draw {
  id: string;
  monthKey: string;
  monthLabel: string;
  scheduledFor: string;
  mode: "random" | "algorithmic";
  status: "draft" | "simulated" | "published";
  carryOver: number;
  prizePoolTotal: number;
  numbers: number[] | null;
  simulationNumbers: number[] | null;
  winnerIds: string[];
  entryCount?: number;
  preview?: {
    three: number;
    four: number;
    five: number;
  } | null;
  winnerCount?: number;
}

export interface WinnerEntry {
  id: string;
  drawId: string;
  userId: string;
  matchCount: 3 | 4 | 5;
  prizeAmount: number;
  proofUrl: string | null;
  verificationStatus: "not_submitted" | "pending" | "approved" | "rejected";
  payoutStatus: "pending" | "paid";
  notes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  drawLabel?: string;
  userName?: string;
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  targetAmount: number;
  linkedCharityIds: string[];
  countryCode: string;
  createdAt: string;
  startsAt: string;
  endsAt: string | null;
  raisedTotal?: number;
  supporterCount?: number;
}

export interface PublicOverview {
  stats: {
    activeSubscribers: number;
    totalCharityRaised: number;
    currentPrizePool: number;
    currentCarryOver: number;
  };
  currentDraw: {
    id: string;
    monthLabel: string;
    status: "draft" | "simulated" | "published";
    mode: "random" | "algorithmic";
    carryOver: number;
    prizePoolTotal: number;
    simulatedNumbers: number[] | null;
  };
  featuredCharities: Charity[];
  featuredCampaigns: Campaign[];
  featuredWinners: WinnerEntry[];
  pricing: {
    monthly: number;
    yearly: number;
    charityMinimumPercent: number;
  };
  billing: {
    stripeConfigured: boolean;
  };
}

export interface MemberDashboard {
  user: UserSummary;
  charities: Charity[];
  campaigns: Campaign[];
  upcomingDraw: Draw & {
    activeEntry: number[];
    previewNumbers: number[] | null;
  };
  participation: {
    drawsEntered: number;
    eligibleForCurrentDraw: boolean;
  };
  winnings: {
    totalWon: number;
    pendingPayouts: number;
    entries: WinnerEntry[];
  };
  billing: {
    stripeConfigured: boolean;
    billingPortalAvailable: boolean;
  };
  recentDraws: Draw[];
}

export interface AdminDashboard {
  metrics: {
    totalUsers: number;
    activeSubscribers: number;
    currentPrizePool: number;
    totalCharityRaised: number;
    pendingWinnerProofs: number;
    nextCarryOver: number;
    corporateAccounts: number;
    teamAccounts: number;
    activeCampaigns: number;
  };
  reports: {
    planMix: {
      monthly: number;
      yearly: number;
    };
    accountTypeBreakdown: Array<{
      type: AccountType;
      count: number;
    }>;
    subscriptionBreakdown: Array<{
      status: "active" | "inactive" | "cancelled" | "lapsed";
      count: number;
    }>;
    payoutTotals: {
      pendingAmount: number;
      paidAmount: number;
    };
    donationBreakdown: {
      subscription: number;
      independent: number;
    };
    countryBreakdown: Array<{
      countryCode: string;
      members: number;
    }>;
    charityLeaderboard: Array<{
      charityId: string;
      name: string;
      totalRaised: number;
      supporters: number;
    }>;
    drawStats: {
      publishedDraws: number;
      simulatedDraws: number;
      averageEntries: number;
      totalWinners: number;
    };
    campaignSummary: {
      active: number;
      draft: number;
      archived: number;
    };
  };
  users: UserSummary[];
  scores: Array<
    Score & {
      userName: string;
    }
  >;
  charities: Charity[];
  campaigns: Campaign[];
  draws: Draw[];
  winners: WinnerEntry[];
}

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  role: "subscriber" | "admin";
}
