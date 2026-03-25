import bcrypt from "bcryptjs";
import { addDays, addMonths, format, subDays, subMonths } from "date-fns";
import { MONTHLY_PRICE, YEARLY_PRICE } from "./constants.js";
import type { Campaign, Charity, DataStore, Donation, Draw, DrawEntry, Score, User, Winner } from "./types.js";

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createSeedData(): Promise<DataStore> {
  const now = new Date();
  const previousMonth = subMonths(now, 1);
  const currentMonthKey = format(now, "yyyy-MM");
  const previousMonthKey = format(previousMonth, "yyyy-MM");

  const charities: Charity[] = [
    {
      id: "charity-fairway-futures",
      name: "Fairway Futures",
      slug: "fairway-futures",
      category: "Youth Access",
      shortDescription: "Opening the game to juniors through equipment grants and coaching.",
      description:
        "Fairway Futures funds coaching access, starter memberships, and equipment kits for young players who would otherwise be shut out of the sport.",
      imageUrl:
        "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80",
      ],
      upcomingEvent: "Junior launch clinic on April 18",
      featured: true,
      countryCode: "GB",
    },
    {
      id: "charity-hope-horizon",
      name: "Hope Horizon",
      slug: "hope-horizon",
      category: "Cancer Support",
      shortDescription: "Wellbeing retreats and emergency grants for families in treatment.",
      description:
        "Hope Horizon combines emergency financial support with restorative experiences for families navigating cancer treatment and recovery.",
      imageUrl:
        "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80",
      ],
      upcomingEvent: "Spring charity golf day on May 6",
      featured: true,
      countryCode: "GB",
    },
    {
      id: "charity-junior-greens",
      name: "Junior Greens Foundation",
      slug: "junior-greens-foundation",
      category: "Education",
      shortDescription: "Scholarships and community golf programs for underrepresented schools.",
      description:
        "Junior Greens Foundation pairs scholarship support with after-school golf programs focused on confidence, discipline, and belonging.",
      imageUrl:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=80",
      ],
      upcomingEvent: "Schools championship fundraiser on April 27",
      featured: false,
      countryCode: "US",
    },
    {
      id: "charity-recovery-swing",
      name: "Recovery Swing",
      slug: "recovery-swing",
      category: "Rehabilitation",
      shortDescription: "Golf-based recovery sessions for veterans and injury rehab groups.",
      description:
        "Recovery Swing uses adaptive golf, mobility coaching, and peer support to help people rebuild confidence after injury and service-related trauma.",
      imageUrl:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
      ],
      upcomingEvent: "Adaptive skills showcase on May 12",
      featured: false,
      countryCode: "CA",
    },
    {
      id: "charity-community-caddie",
      name: "Community Caddie Fund",
      slug: "community-caddie-fund",
      category: "Community Relief",
      shortDescription: "Emergency community grants funded through golf-led campaigns.",
      description:
        "Community Caddie Fund directs fast-turnaround grants to grassroots charities running urgent local support projects.",
      imageUrl:
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      galleryImages: [
        "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1200&q=80",
      ],
      upcomingEvent: "Spotlight dinner on April 30",
      featured: true,
      countryCode: "US",
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: "campaign-youth-opening-drive",
      name: "Opening Drive for Youth Access",
      slug: "opening-drive-for-youth-access",
      description:
        "A featured campaign bundling junior access charities into a single seasonal push across subscription upgrades and independent gifts.",
      status: "active",
      targetAmount: 5000,
      linkedCharityIds: ["charity-fairway-futures", "charity-junior-greens"],
      countryCode: "GB",
      createdAt: subMonths(now, 2).toISOString(),
      startsAt: subMonths(now, 1).toISOString(),
      endsAt: addMonths(now, 2).toISOString(),
    },
    {
      id: "campaign-recovery-momentum",
      name: "Recovery Momentum",
      slug: "recovery-momentum",
      description:
        "A campaign framework for rehabilitation and adaptive golf partners, ready for regional rollouts and future sponsor bundles.",
      status: "draft",
      targetAmount: 3200,
      linkedCharityIds: ["charity-recovery-swing", "charity-hope-horizon"],
      countryCode: "CA",
      createdAt: subDays(now, 16).toISOString(),
      startsAt: addDays(now, 14).toISOString(),
      endsAt: addMonths(now, 3).toISOString(),
    },
  ];

  const [adminHash, alexHash, mayaHash, noahHash, ellaHash] = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Player123!", 10),
    bcrypt.hash("Player123!", 10),
    bcrypt.hash("Player123!", 10),
    bcrypt.hash("Player123!", 10),
  ]);

  const users: User[] = [
    {
      id: "user-admin",
      name: "Sophie Reed",
      email: "admin@goodlie.club",
      passwordHash: adminHash,
      role: "admin",
      accountType: "corporate",
      countryCode: "GB",
      organizationName: "Good Lie Club HQ",
      selectedCharityId: "charity-hope-horizon",
      charityPercentage: 0.2,
      createdAt: subMonths(now, 8).toISOString(),
      subscription: {
        plan: "yearly",
        status: "active",
        startedAt: subMonths(now, 8).toISOString(),
        renewalDate: addMonths(now, 4).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    },
    {
      id: "user-alex",
      name: "Alex Morgan",
      email: "alex@goodlie.club",
      passwordHash: alexHash,
      role: "subscriber",
      accountType: "individual",
      countryCode: "GB",
      organizationName: null,
      selectedCharityId: "charity-fairway-futures",
      charityPercentage: 0.15,
      createdAt: subMonths(now, 3).toISOString(),
      subscription: {
        plan: "monthly",
        status: "active",
        startedAt: subMonths(now, 3).toISOString(),
        renewalDate: addDays(now, 5).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    },
    {
      id: "user-maya",
      name: "Maya Patel",
      email: "maya@goodlie.club",
      passwordHash: mayaHash,
      role: "subscriber",
      accountType: "corporate",
      countryCode: "GB",
      organizationName: "Maya Patel Consulting",
      selectedCharityId: "charity-hope-horizon",
      charityPercentage: 0.2,
      createdAt: subMonths(now, 6).toISOString(),
      subscription: {
        plan: "yearly",
        status: "active",
        startedAt: subMonths(now, 6).toISOString(),
        renewalDate: addMonths(now, 6).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    },
    {
      id: "user-noah",
      name: "Noah Carter",
      email: "noah@goodlie.club",
      passwordHash: noahHash,
      role: "subscriber",
      accountType: "team",
      countryCode: "US",
      organizationName: "Noah Carter Fourball",
      selectedCharityId: "charity-community-caddie",
      charityPercentage: 0.12,
      createdAt: subMonths(now, 2).toISOString(),
      subscription: {
        plan: "monthly",
        status: "active",
        startedAt: subMonths(now, 2).toISOString(),
        renewalDate: addDays(now, 12).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    },
    {
      id: "user-ella",
      name: "Ella Brooks",
      email: "ella@goodlie.club",
      passwordHash: ellaHash,
      role: "subscriber",
      accountType: "individual",
      countryCode: "CA",
      organizationName: null,
      selectedCharityId: "charity-junior-greens",
      charityPercentage: 0.1,
      createdAt: subMonths(now, 1).toISOString(),
      subscription: {
        plan: "monthly",
        status: "lapsed",
        startedAt: subMonths(now, 1).toISOString(),
        renewalDate: subDays(now, 3).toISOString(),
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
    },
  ];

  const scoreTemplate: Array<[string, number[], number[]]> = [
    ["user-alex", [31, 27, 18, 41, 39], [4, 11, 17, 23, 29]],
    ["user-maya", [18, 24, 11, 27, 7], [3, 10, 16, 24, 31]],
    ["user-noah", [39, 12, 27, 24, 5], [5, 13, 20, 28, 35]],
    ["user-ella", [10, 15, 22, 18, 9], [2, 8, 15, 21, 27]],
  ];

  const scores: Score[] = scoreTemplate.flatMap(([userId, values, daysAgo]) =>
    values.map((value, index) => ({
      id: `${userId}-score-${index + 1}`,
      userId,
      value,
      playedAt: subDays(now, daysAgo[index]).toISOString(),
      createdAt: subDays(now, daysAgo[index] - 1).toISOString(),
    })),
  );

  const lastDrawPrizePool = roundCurrency((MONTHLY_PRICE + YEARLY_PRICE + MONTHLY_PRICE) * 0.45);
  const lastFiveMatchPool = roundCurrency(lastDrawPrizePool * 0.4);
  const lastFourMatchPool = roundCurrency(lastDrawPrizePool * 0.35);
  const lastThreeMatchPool = roundCurrency(lastDrawPrizePool * 0.25);

  const draws: Draw[] = [
    {
      id: "draw-previous",
      monthKey: previousMonthKey,
      monthLabel: format(previousMonth, "MMMM yyyy"),
      scheduledFor: previousMonth.toISOString(),
      mode: "random",
      status: "published",
      carryOver: 0,
      simulationNumbers: [18, 24, 27, 31, 39],
      numbers: [18, 24, 27, 31, 39],
      prizePoolTotal: lastDrawPrizePool,
      winnerIds: ["winner-alex", "winner-maya", "winner-noah"],
      simulatedAt: subDays(now, 35).toISOString(),
      publishedAt: subDays(now, 30).toISOString(),
    },
    {
      id: "draw-current",
      monthKey: currentMonthKey,
      monthLabel: format(now, "MMMM yyyy"),
      scheduledFor: now.toISOString(),
      mode: "algorithmic",
      status: "draft",
      carryOver: lastFiveMatchPool,
      simulationNumbers: null,
      numbers: null,
      prizePoolTotal: 0,
      winnerIds: [],
      simulatedAt: null,
      publishedAt: null,
    },
  ];

  const winners: Winner[] = [
    {
      id: "winner-alex",
      drawId: "draw-previous",
      userId: "user-alex",
      matchCount: 4,
      prizeAmount: lastFourMatchPool,
      proofUrl: null,
      verificationStatus: "not_submitted",
      payoutStatus: "pending",
      notes: null,
      createdAt: subDays(now, 30).toISOString(),
      reviewedAt: null,
    },
    {
      id: "winner-maya",
      drawId: "draw-previous",
      userId: "user-maya",
      matchCount: 3,
      prizeAmount: roundCurrency(lastThreeMatchPool / 2),
      proofUrl: "https://example.com/proof/maya-scorecard.png",
      verificationStatus: "approved",
      payoutStatus: "paid",
      notes: "Verified against the club portal.",
      createdAt: subDays(now, 30).toISOString(),
      reviewedAt: subDays(now, 26).toISOString(),
    },
    {
      id: "winner-noah",
      drawId: "draw-previous",
      userId: "user-noah",
      matchCount: 3,
      prizeAmount: roundCurrency(lastThreeMatchPool / 2),
      proofUrl: "https://example.com/proof/noah-scorecard.png",
      verificationStatus: "pending",
      payoutStatus: "pending",
      notes: "Awaiting screenshot quality check.",
      createdAt: subDays(now, 30).toISOString(),
      reviewedAt: null,
    },
  ];

  const entries: DrawEntry[] = [
    {
      id: "entry-alex-previous",
      drawId: "draw-previous",
      userId: "user-alex",
      numbers: [31, 27, 18, 41, 39],
      createdAt: subDays(now, 30).toISOString(),
    },
    {
      id: "entry-maya-previous",
      drawId: "draw-previous",
      userId: "user-maya",
      numbers: [18, 24, 11, 27, 7],
      createdAt: subDays(now, 30).toISOString(),
    },
    {
      id: "entry-noah-previous",
      drawId: "draw-previous",
      userId: "user-noah",
      numbers: [39, 12, 27, 24, 5],
      createdAt: subDays(now, 30).toISOString(),
    },
  ];

  const donations: Donation[] = [
    {
      id: "donation-1",
      charityId: "charity-fairway-futures",
      userId: "user-alex",
      amount: roundCurrency(MONTHLY_PRICE * 0.15),
      donorName: "Alex Morgan",
      donorEmail: "alex@goodlie.club",
      kind: "subscription",
      referenceId: null,
      createdAt: subDays(now, 28).toISOString(),
    },
    {
      id: "donation-2",
      charityId: "charity-hope-horizon",
      userId: "user-maya",
      amount: roundCurrency(YEARLY_PRICE * 0.2),
      donorName: "Maya Patel",
      donorEmail: "maya@goodlie.club",
      kind: "subscription",
      referenceId: null,
      createdAt: subDays(now, 28).toISOString(),
    },
    {
      id: "donation-3",
      charityId: "charity-community-caddie",
      userId: "user-noah",
      amount: roundCurrency(MONTHLY_PRICE * 0.12),
      donorName: "Noah Carter",
      donorEmail: "noah@goodlie.club",
      kind: "subscription",
      referenceId: null,
      createdAt: subDays(now, 28).toISOString(),
    },
    {
      id: "donation-4",
      charityId: "charity-hope-horizon",
      userId: null,
      amount: 125,
      donorName: "Corporate Fourball",
      donorEmail: "events@example.com",
      kind: "independent",
      referenceId: null,
      createdAt: subDays(now, 12).toISOString(),
    },
    {
      id: "donation-5",
      charityId: "charity-community-caddie",
      userId: null,
      amount: 80,
      donorName: "Guest Donor",
      donorEmail: "guest@example.com",
      kind: "independent",
      referenceId: null,
      createdAt: subDays(now, 6).toISOString(),
    },
  ];

  return {
    users,
    scores,
    charities,
    campaigns,
    draws,
    entries,
    winners,
    donations,
  };
}
