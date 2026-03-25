import bcrypt from "bcryptjs";
import {
  addMonths,
  addYears,
  compareAsc,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import type Stripe from "stripe";
import { z } from "zod";
import {
  constructWebhookEvent,
  createCheckoutSession as createStripeCheckoutSession,
  createCustomer as createStripeCustomer,
  createCustomerPortalSession,
  getPlanFromSubscription,
  getRenewalDateFromSubscription,
  isStripeConfigured,
  mapStripeStatus,
  resumeSubscription,
  retrieveSubscription,
  scheduleSubscriptionCancellation,
} from "./billing.js";
import {
  DRAW_SIZE,
  MIN_CHARITY_PERCENT,
  MONTHLY_PRICE,
  PRIZE_POOL_SHARE,
  PRIZE_SHARE_BY_MATCH,
  SCORE_MAX,
  SCORE_MIN,
  YEARLY_PRICE,
} from "./constants.js";
import { sendEmail } from "./email.js";
import { readStore, writeStore } from "./store.js";
import type {
  AccountType,
  Campaign,
  Charity,
  DataStore,
  Draw,
  DrawMode,
  Score,
  SubscriptionPlan,
  User,
  VerificationStatus,
  Winner,
} from "./types.js";

const countryCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const accountTypeSchema = z.enum(["individual", "team", "corporate"]);

const scoreSchema = z.object({
  value: z.coerce.number().int().min(SCORE_MIN).max(SCORE_MAX),
  playedAt: z.string(),
});

const charityPreferenceSchema = z.object({
  charityId: z.string().min(1),
  charityPercentage: z.coerce.number().min(MIN_CHARITY_PERCENT).max(1),
});

const subscriptionSchema = z.object({
  plan: z.enum(["monthly", "yearly"]),
});

const signupSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  password: z.string().min(8),
  accountType: accountTypeSchema.default("individual"),
  countryCode: countryCodeSchema.default("GB"),
  organizationName: z.string().trim().max(120).optional().or(z.literal("")),
  charityId: z.string().min(1),
  charityPercentage: z.coerce.number().min(MIN_CHARITY_PERCENT).max(1),
  plan: z.enum(["monthly", "yearly"]),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const donationSchema = z.object({
  donorName: z.string().trim().min(2),
  donorEmail: z.email().optional().or(z.literal("")),
  charityId: z.string().min(1),
  amount: z.coerce.number().positive(),
});

const charityMutationSchema = z.object({
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  shortDescription: z.string().trim().min(10),
  description: z.string().trim().min(30),
  imageUrl: z.string().url(),
  galleryImages: z.array(z.string().url()).default([]),
  upcomingEvent: z.string().trim().min(4),
  featured: z.coerce.boolean(),
  countryCode: countryCodeSchema.default("GB"),
});

const userAdminSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.email().optional(),
  accountType: accountTypeSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  organizationName: z.string().trim().max(120).optional().or(z.literal("")),
  selectedCharityId: z.string().optional(),
  charityPercentage: z.coerce.number().min(MIN_CHARITY_PERCENT).max(1).optional(),
  role: z.enum(["subscriber", "admin"]).optional(),
  subscriptionStatus: z.enum(["active", "inactive", "cancelled", "lapsed"]).optional(),
  subscriptionPlan: z.enum(["monthly", "yearly"]).optional(),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  accountType: accountTypeSchema,
  countryCode: countryCodeSchema,
  organizationName: z.string().trim().max(120).optional().or(z.literal("")),
});

const campaignMutationSchema = z.object({
  name: z.string().trim().min(3),
  description: z.string().trim().min(20),
  status: z.enum(["draft", "active", "archived"]),
  targetAmount: z.coerce.number().min(0),
  linkedCharityIds: z.array(z.string().min(1)).min(1),
  countryCode: countryCodeSchema,
  startsAt: z.string(),
  endsAt: z.string().optional().or(z.literal("")),
});

const scoreAdminSchema = z.object({
  value: z.coerce.number().int().min(SCORE_MIN).max(SCORE_MAX).optional(),
  playedAt: z.string().optional(),
});

const winnerReviewSchema = z.object({
  verificationStatus: z
    .enum(["not_submitted", "pending", "approved", "rejected"])
    .optional(),
  payoutStatus: z.enum(["pending", "paid"]).optional(),
  notes: z.string().optional(),
});

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getPlanPrice(plan: SubscriptionPlan) {
  return plan === "monthly" ? MONTHLY_PRICE : YEARLY_PRICE;
}

function getMonthKey(date: Date) {
  return format(date, "yyyy-MM");
}

function getMonthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

async function safeSendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  try {
    await sendEmail(input);
  } catch (error) {
    console.error("Email dispatch failed:", error);
  }
}

function findUserById(data: DataStore, userId: string) {
  return data.users.find((item) => item.id === userId);
}

function findUserByStripeReference(data: DataStore, input: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  if (input.userId) {
    const byId = findUserById(data, input.userId);

    if (byId) {
      return byId;
    }
  }

  if (input.subscriptionId) {
    const bySubscription = data.users.find(
      (user) => user.subscription.stripeSubscriptionId === input.subscriptionId,
    );

    if (bySubscription) {
      return bySubscription;
    }
  }

  if (input.customerId) {
    return data.users.find((user) => user.subscription.stripeCustomerId === input.customerId);
  }

  return undefined;
}

function applySubscriptionSnapshot(
  user: User,
  input: {
    plan?: SubscriptionPlan | null;
    status: User["subscription"]["status"];
    startedAt?: string | null;
    renewalDate?: string | null;
    cancelAtPeriodEnd?: boolean;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
) {
  user.subscription.plan = input.plan ?? user.subscription.plan;
  user.subscription.status = input.status;
  user.subscription.startedAt = input.startedAt ?? user.subscription.startedAt;
  user.subscription.renewalDate = input.renewalDate ?? user.subscription.renewalDate;
  user.subscription.cancelAtPeriodEnd =
    input.cancelAtPeriodEnd ?? user.subscription.cancelAtPeriodEnd;
  user.subscription.stripeCustomerId =
    input.stripeCustomerId ?? user.subscription.stripeCustomerId;
  user.subscription.stripeSubscriptionId =
    input.stripeSubscriptionId ?? user.subscription.stripeSubscriptionId;
}

function recordSubscriptionDonation(
  data: DataStore,
  user: User,
  input: {
    amount: number;
    createdAt?: string;
    referenceId?: string | null;
  },
) {
  if (
    input.referenceId &&
    data.donations.some((donation) => donation.referenceId === input.referenceId)
  ) {
    return;
  }

  data.donations.push({
    id: createId("donation"),
    charityId: user.selectedCharityId,
    userId: user.id,
    amount: roundCurrency(input.amount),
    donorName: user.name,
    donorEmail: user.email,
    kind: "subscription",
    referenceId: input.referenceId ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

async function syncUserWithStripeSubscription(
  data: DataStore,
  subscription: Stripe.Subscription,
  input: {
    userId?: string | null;
    fallbackPlan?: SubscriptionPlan | null;
  } = {},
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const user = findUserByStripeReference(data, {
    userId: input.userId ?? subscription.metadata.userId ?? null,
    customerId,
    subscriptionId: subscription.id,
  });

  if (!user) {
    throw new Error("No user matched the Stripe subscription event.");
  }

  applySubscriptionSnapshot(user, {
    plan: getPlanFromSubscription(subscription) ?? input.fallbackPlan ?? user.subscription.plan,
    status: mapStripeStatus(subscription.status),
    startedAt: subscription.start_date
      ? new Date(subscription.start_date * 1000).toISOString()
      : user.subscription.startedAt,
    renewalDate: getRenewalDateFromSubscription(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  return user;
}

function sortScoresDescending(left: Score, right: Score) {
  return (
    compareAsc(parseISO(right.playedAt), parseISO(left.playedAt)) ||
    compareAsc(parseISO(right.createdAt), parseISO(left.createdAt))
  );
}

function sortScoresAscending(left: Score, right: Score) {
  return (
    compareAsc(parseISO(left.playedAt), parseISO(right.playedAt)) ||
    compareAsc(parseISO(left.createdAt), parseISO(right.createdAt))
  );
}

function validateDate(value: string) {
  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    throw new Error("Please provide a valid date.");
  }

  return parsed;
}

function sanitizeUser(user: User, data: DataStore) {
  const selectedCharity = data.charities.find((charity) => charity.id === user.selectedCharityId);
  const latestScores = getLatestScores(data, user.id);
  const winnings = data.winners
    .filter((winner) => winner.userId === user.id)
    .reduce((total, winner) => total + winner.prizeAmount, 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    countryCode: user.countryCode,
    organizationName: user.organizationName,
    createdAt: user.createdAt,
    charityPercentage: user.charityPercentage,
    subscription: user.subscription,
    selectedCharity,
    latestScores,
    totalWon: roundCurrency(winnings),
  };
}

function computeCharityTotals(data: DataStore) {
  return data.donations.reduce<Record<string, number>>((totals, donation) => {
    totals[donation.charityId] = roundCurrency((totals[donation.charityId] ?? 0) + donation.amount);
    return totals;
  }, {});
}

function computeCharitySubscriberCounts(data: DataStore) {
  return data.users.reduce<Record<string, number>>((totals, user) => {
    totals[user.selectedCharityId] = (totals[user.selectedCharityId] ?? 0) + 1;
    return totals;
  }, {});
}

function withCharityTotals(data: DataStore) {
  const totals = computeCharityTotals(data);
  const subscriberCounts = computeCharitySubscriberCounts(data);

  return data.charities.map((charity) => ({
    ...charity,
    raisedTotal: totals[charity.id] ?? 0,
    subscriberCount: subscriberCounts[charity.id] ?? 0,
  }));
}

function withCampaignTotals(data: DataStore) {
  const charityTotals = computeCharityTotals(data);
  const subscriberCounts = computeCharitySubscriberCounts(data);

  return data.campaigns.map((campaign) => ({
    ...campaign,
    raisedTotal: roundCurrency(
      campaign.linkedCharityIds.reduce(
        (sum, charityId) => sum + (charityTotals[charityId] ?? 0),
        0,
      ),
    ),
    supporterCount: campaign.linkedCharityIds.reduce(
      (sum, charityId) => sum + (subscriberCounts[charityId] ?? 0),
      0,
    ),
  }));
}

function getLatestScores(data: DataStore, userId: string) {
  return data.scores.filter((score) => score.userId === userId).sort(sortScoresDescending);
}

function getActiveUsers(data: DataStore) {
  return data.users.filter(
    (user) => user.role === "subscriber" && user.subscription.status === "active",
  );
}

function getEligibleEntries(data: DataStore) {
  return getActiveUsers(data)
    .map((user) => {
      const entry = getLatestScores(data, user.id).slice(0, DRAW_SIZE).map((score) => score.value);
      return {
        user,
        entry,
      };
    })
    .filter((item) => item.entry.length === DRAW_SIZE);
}

function getPlanMix(data: DataStore) {
  return data.users.reduce(
    (mix, user) => {
      mix[user.subscription.plan] += 1;
      return mix;
    },
    { monthly: 0, yearly: 0 },
  );
}

function getAccountTypeBreakdown(data: DataStore) {
  const counts = new Map<AccountType, number>([
    ["individual", 0],
    ["team", 0],
    ["corporate", 0],
  ]);

  for (const user of data.users) {
    counts.set(user.accountType, (counts.get(user.accountType) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function getSubscriptionBreakdown(data: DataStore) {
  const counts = new Map<User["subscription"]["status"], number>([
    ["active", 0],
    ["inactive", 0],
    ["cancelled", 0],
    ["lapsed", 0],
  ]);

  for (const user of data.users) {
    counts.set(user.subscription.status, (counts.get(user.subscription.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

function getCountryBreakdown(data: DataStore) {
  const counts = new Map<string, number>();

  for (const user of data.users) {
    counts.set(user.countryCode, (counts.get(user.countryCode) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([countryCode, members]) => ({ countryCode, members }))
    .sort((left, right) => right.members - left.members);
}

function getDonationBreakdown(data: DataStore) {
  return data.donations.reduce(
    (breakdown, donation) => {
      breakdown[donation.kind] = roundCurrency(breakdown[donation.kind] + donation.amount);
      return breakdown;
    },
    { subscription: 0, independent: 0 },
  );
}

function getPayoutTotals(data: DataStore) {
  return data.winners.reduce(
    (totals, winner) => {
      if (winner.payoutStatus === "paid") {
        totals.paidAmount = roundCurrency(totals.paidAmount + winner.prizeAmount);
      } else {
        totals.pendingAmount = roundCurrency(totals.pendingAmount + winner.prizeAmount);
      }

      return totals;
    },
    { pendingAmount: 0, paidAmount: 0 },
  );
}

function getCharityLeaderboard(data: DataStore) {
  return withCharityTotals(data)
    .map((charity) => ({
      charityId: charity.id,
      name: charity.name,
      totalRaised: charity.raisedTotal ?? 0,
      supporters: charity.subscriberCount ?? 0,
    }))
    .sort((left, right) => right.totalRaised - left.totalRaised)
    .slice(0, 5);
}

function getDrawStats(data: DataStore) {
  const publishedDraws = data.draws.filter((draw) => draw.status === "published");
  const simulatedDraws = data.draws.filter((draw) => draw.status === "simulated").length;
  const entryCounts = publishedDraws.map(
    (draw) => data.entries.filter((entry) => entry.drawId === draw.id).length,
  );

  return {
    publishedDraws: publishedDraws.length,
    simulatedDraws,
    averageEntries: publishedDraws.length
      ? roundCurrency(entryCounts.reduce((sum, count) => sum + count, 0) / publishedDraws.length)
      : 0,
    totalWinners: data.winners.length,
  };
}

function getCampaignSummary(campaigns: Campaign[]) {
  return campaigns.reduce(
    (summary, campaign) => {
      summary[campaign.status] += 1;
      return summary;
    },
    { active: 0, draft: 0, archived: 0 },
  );
}

function resolveLinkedCharityIds(data: DataStore, values: string[]) {
  return values.map((value) => {
    const normalized = value.trim();
    const charity = data.charities.find(
      (item) =>
        item.id === normalized ||
        item.slug === normalized ||
        item.name.toLowerCase() === normalized.toLowerCase(),
    );

    if (!charity) {
      throw new Error(`Campaign charity "${normalized}" was not found.`);
    }

    return charity.id;
  });
}

function computePrizePool(data: DataStore) {
  const totalRevenue = getActiveUsers(data).reduce(
    (sum, user) => sum + getPlanPrice(user.subscription.plan),
    0,
  );

  return roundCurrency(totalRevenue * PRIZE_POOL_SHARE);
}

function countMatches(entry: number[], drawNumbers: number[]) {
  const drawCounts = new Map<number, number>();

  for (const number of drawNumbers) {
    drawCounts.set(number, (drawCounts.get(number) ?? 0) + 1);
  }

  let matches = 0;

  for (const number of entry) {
    const count = drawCounts.get(number) ?? 0;

    if (count > 0) {
      matches += 1;
      drawCounts.set(number, count - 1);
    }
  }

  return matches;
}

function generateRandomNumbers() {
  return Array.from({ length: DRAW_SIZE }, () => Math.floor(Math.random() * SCORE_MAX) + 1);
}

function generateAlgorithmicNumbers(data: DataStore) {
  const entries = getEligibleEntries(data);

  if (!entries.length) {
    return generateRandomNumbers();
  }

  const counts = new Map<number, number>();

  for (const item of entries) {
    for (const value of item.entry) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const maxFrequency = Math.max(...counts.values());
  const weightedPool = Array.from({ length: SCORE_MAX }, (_, index) => {
    const value = index + 1;
    const frequency = counts.get(value) ?? 0;
    const weight = frequency + (maxFrequency - frequency + 1) * 0.65;
    return {
      value,
      weight,
    };
  });

  const numbers: number[] = [];

  while (numbers.length < DRAW_SIZE) {
    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const item of weightedPool) {
      cursor -= item.weight;

      if (cursor <= 0) {
        numbers.push(item.value);
        break;
      }
    }
  }

  return numbers;
}

function createDraftDraw(date: Date, carryOver: number): Draw {
  return {
    id: createId("draw"),
    monthKey: getMonthKey(date),
    monthLabel: getMonthLabel(date),
    scheduledFor: startOfMonth(date).toISOString(),
    mode: "random",
    status: "draft",
    carryOver: roundCurrency(carryOver),
    simulationNumbers: null,
    numbers: null,
    prizePoolTotal: 0,
    winnerIds: [],
    simulatedAt: null,
    publishedAt: null,
  };
}

function ensureCurrentDraw(data: DataStore) {
  const monthKey = getMonthKey(new Date());
  let draw = data.draws.find((item) => item.monthKey === monthKey && item.status !== "published");

  if (!draw) {
    const latestPublished = data.draws
      .filter((item) => item.status === "published")
      .sort((left, right) => compareAsc(parseISO(right.scheduledFor), parseISO(left.scheduledFor)))[0];
    const carryOver = latestPublished?.winnerIds
      ? data.winners
          .filter((winner) => winner.drawId === latestPublished.id && winner.matchCount === 5)
          .length
        ? 0
        : roundCurrency(latestPublished?.prizePoolTotal * PRIZE_SHARE_BY_MATCH[5] || 0)
      : 0;

    draw = createDraftDraw(new Date(), carryOver);
    data.draws.push(draw);
  }

  return draw;
}

function getDrawNumbers(draw: Draw) {
  return draw.simulationNumbers ?? draw.numbers ?? [];
}

function getPreview(data: DataStore, numbers: number[]) {
  const counts = { three: 0, four: 0, five: 0 };

  for (const item of getEligibleEntries(data)) {
    const matches = countMatches(item.entry, numbers);

    if (matches === 3) counts.three += 1;
    if (matches === 4) counts.four += 1;
    if (matches === 5) counts.five += 1;
  }

  return counts;
}

async function persist(data: DataStore) {
  await writeStore(data);
  return data;
}

export async function getPublicOverview() {
  const data = await readStore();
  const charities = withCharityTotals(data);
  const campaigns = withCampaignTotals(data);
  const activeSubscribers = getActiveUsers(data).length;
  const currentDraw = ensureCurrentDraw(data);
  await persist(data);

  return {
    stats: {
      activeSubscribers,
      totalCharityRaised: roundCurrency(
        data.donations.reduce((sum, donation) => sum + donation.amount, 0),
      ),
      currentPrizePool: computePrizePool(data),
      currentCarryOver: currentDraw.carryOver,
    },
    currentDraw: {
      id: currentDraw.id,
      monthLabel: currentDraw.monthLabel,
      status: currentDraw.status,
      mode: currentDraw.mode,
      carryOver: currentDraw.carryOver,
      prizePoolTotal: computePrizePool(data),
      simulatedNumbers: currentDraw.status === "simulated" ? currentDraw.simulationNumbers : null,
    },
    featuredCharities: charities.filter((charity) => charity.featured).slice(0, 3),
    featuredCampaigns: campaigns.filter((campaign) => campaign.status === "active").slice(0, 2),
    featuredWinners: data.winners
      .slice()
      .sort((left, right) => compareAsc(parseISO(right.createdAt), parseISO(left.createdAt)))
      .slice(0, 3)
      .map((winner) => {
        const user = data.users.find((item) => item.id === winner.userId);
        return {
          ...winner,
          userName: user?.name ?? "Unknown player",
        };
      }),
    pricing: {
      monthly: MONTHLY_PRICE,
      yearly: YEARLY_PRICE,
      charityMinimumPercent: MIN_CHARITY_PERCENT,
    },
    billing: {
      stripeConfigured: isStripeConfigured(),
    },
  };
}

export async function getPublicCharities() {
  const data = await readStore();
  return withCharityTotals(data);
}

export async function getPublicDraws() {
  const data = await readStore();
  return data.draws
    .slice()
    .sort((left, right) => compareAsc(parseISO(right.scheduledFor), parseISO(left.scheduledFor)))
    .map((draw) => ({
      ...draw,
      numbers: draw.status === "published" ? draw.numbers : null,
      simulationNumbers: draw.status === "published" ? draw.simulationNumbers : null,
      entryCount: data.entries.filter((entry) => entry.drawId === draw.id).length,
      winnerCount: data.winners.filter((winner) => winner.drawId === draw.id).length,
    }));
}

export async function createIndependentDonation(input: unknown) {
  const payload = donationSchema.parse(input);
  const data = await readStore();

  if (!data.charities.find((charity) => charity.id === payload.charityId)) {
    throw new Error("That charity could not be found.");
  }

  data.donations.push({
    id: createId("donation"),
    charityId: payload.charityId,
    userId: null,
    amount: roundCurrency(payload.amount),
    donorName: payload.donorName,
    donorEmail: payload.donorEmail || null,
    kind: "independent",
    referenceId: null,
    createdAt: new Date().toISOString(),
  });

  await persist(data);

  return { success: true };
}

export async function registerUser(input: unknown) {
  const payload = signupSchema.parse(input);
  const data = await readStore();

  if (data.users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
    throw new Error("An account with that email already exists.");
  }

  if (!data.charities.find((charity) => charity.id === payload.charityId)) {
    throw new Error("Please choose a valid charity.");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user: User = {
    id: createId("user"),
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash,
    role: "subscriber",
    accountType: payload.accountType,
    countryCode: payload.countryCode,
    organizationName: payload.organizationName || null,
    selectedCharityId: payload.charityId,
    charityPercentage: payload.charityPercentage,
    createdAt: new Date().toISOString(),
    subscription: {
      plan: payload.plan,
      status: "inactive",
      startedAt: null,
      renewalDate: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
  };

  data.users.push(user);
  await persist(data);

  void safeSendEmail({
    to: user.email,
    subject: "Welcome to Good Lie Club",
    text:
      `Hi ${user.name}, your account is ready. Sign in to complete your ${payload.plan} subscription, ` +
      "set your latest five scores, and start supporting your selected charity.",
  });

  return sanitizeUser(user, data);
}

export async function loginUser(input: unknown) {
  const payload = loginSchema.parse(input);
  const data = await readStore();
  const user = data.users.find((item) => item.email === payload.email.toLowerCase());

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const valid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  return sanitizeUser(user, data);
}

export async function getUserById(userId: string) {
  const data = await readStore();
  return findUserById(data, userId) ?? null;
}

export async function getMemberDashboard(userId: string) {
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const userWinners = data.winners
    .filter((winner) => winner.userId === userId)
    .map((winner) => {
      const draw = data.draws.find((item) => item.id === winner.drawId);
      return {
        ...winner,
        drawLabel: draw?.monthLabel ?? "Unknown draw",
      };
    })
    .sort((left, right) => compareAsc(parseISO(right.createdAt), parseISO(left.createdAt)));

  const currentDraw = ensureCurrentDraw(data);
  await persist(data);

  return {
    user: sanitizeUser(user, data),
    charities: withCharityTotals(data),
    campaigns: withCampaignTotals(data),
    upcomingDraw: {
      ...currentDraw,
      activeEntry: getLatestScores(data, userId).slice(0, DRAW_SIZE).map((score) => score.value),
      previewNumbers: currentDraw.status === "published" ? currentDraw.numbers : null,
    },
    participation: {
      drawsEntered: data.entries.filter((entry) => entry.userId === userId).length,
      eligibleForCurrentDraw:
        user.subscription.status === "active" &&
        getLatestScores(data, userId).slice(0, DRAW_SIZE).length === DRAW_SIZE,
    },
    winnings: {
      totalWon: roundCurrency(userWinners.reduce((sum, winner) => sum + winner.prizeAmount, 0)),
      pendingPayouts: userWinners.filter((winner) => winner.payoutStatus === "pending").length,
      entries: userWinners,
    },
    billing: {
      stripeConfigured: isStripeConfigured(),
      billingPortalAvailable: Boolean(user.subscription.stripeCustomerId && isStripeConfigured()),
    },
    recentDraws: data.draws
      .filter((draw) => draw.status === "published")
      .slice()
      .sort((left, right) => compareAsc(parseISO(right.scheduledFor), parseISO(left.scheduledFor)))
      .slice(0, 4),
  };
}

export async function updateMemberProfile(userId: string, input: unknown) {
  const payload = profileUpdateSchema.parse(input);
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const duplicate = data.users.find(
    (item) => item.id !== userId && item.email === payload.email.toLowerCase(),
  );

  if (duplicate) {
    throw new Error("Another account already uses that email.");
  }

  user.name = payload.name;
  user.email = payload.email.toLowerCase();
  user.accountType = payload.accountType;
  user.countryCode = payload.countryCode;
  user.organizationName = payload.organizationName || null;

  await persist(data);
  return sanitizeUser(user, data);
}

export async function addScoreForUser(userId: string, input: unknown) {
  const payload = scoreSchema.parse(input);
  validateDate(payload.playedAt);
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  data.scores.push({
    id: createId("score"),
    userId,
    value: payload.value,
    playedAt: new Date(payload.playedAt).toISOString(),
    createdAt: new Date().toISOString(),
  });

  const userScores = data.scores.filter((score) => score.userId === userId).sort(sortScoresAscending);

  while (userScores.length > DRAW_SIZE) {
    const oldest = userScores.shift();

    if (oldest) {
      data.scores = data.scores.filter((score) => score.id !== oldest.id);
    }
  }

  await persist(data);
  return getLatestScores(data, userId).slice(0, DRAW_SIZE);
}

export async function updateScoreForUser(userId: string, scoreId: string, input: unknown) {
  const payload = scoreAdminSchema.parse(input);
  const data = await readStore();
  const score = data.scores.find((item) => item.id === scoreId && item.userId === userId);

  if (!score) {
    throw new Error("Score not found.");
  }

  if (typeof payload.value === "number") {
    score.value = payload.value;
  }

  if (payload.playedAt) {
    validateDate(payload.playedAt);
    score.playedAt = new Date(payload.playedAt).toISOString();
  }

  await persist(data);
  return getLatestScores(data, userId).slice(0, DRAW_SIZE);
}

export async function updateCharityPreferences(userId: string, input: unknown) {
  const payload = charityPreferenceSchema.parse(input);
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (!data.charities.find((charity) => charity.id === payload.charityId)) {
    throw new Error("Charity not found.");
  }

  user.selectedCharityId = payload.charityId;
  user.charityPercentage = payload.charityPercentage;

  await persist(data);
  return sanitizeUser(user, data);
}

export async function activateSubscription(userId: string, input: unknown) {
  const payload = subscriptionSchema.parse(input);
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (isStripeConfigured()) {
    if (user.subscription.stripeSubscriptionId && user.subscription.cancelAtPeriodEnd) {
      const subscription = await resumeSubscription(user.subscription.stripeSubscriptionId);
      await syncUserWithStripeSubscription(data, subscription, {
        userId: user.id,
        fallbackPlan: payload.plan,
      });
      await persist(data);

      return {
        mode: "activated" as const,
        user: sanitizeUser(user, data),
      };
    }

    if (!user.subscription.stripeCustomerId) {
      const customer = await createStripeCustomer({
        email: user.email,
        name: user.name,
        userId: user.id,
      });

      user.subscription.stripeCustomerId = customer.id;
      await persist(data);
    }

    const session = await createStripeCheckoutSession({
      customerId: user.subscription.stripeCustomerId,
      email: user.email,
      userId: user.id,
      plan: payload.plan,
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a hosted URL.");
    }

    return {
      mode: "checkout" as const,
      checkoutUrl: session.url,
    };
  }

  const now = new Date();
  applySubscriptionSnapshot(user, {
    plan: payload.plan,
    status: "active",
    startedAt: now.toISOString(),
    renewalDate:
      payload.plan === "monthly"
        ? addMonths(now, 1).toISOString()
        : addYears(now, 1).toISOString(),
    cancelAtPeriodEnd: false,
  });

  recordSubscriptionDonation(data, user, {
    amount: getPlanPrice(payload.plan) * user.charityPercentage,
    createdAt: now.toISOString(),
  });

  await persist(data);
  void safeSendEmail({
    to: user.email,
    subject: "Subscription activated",
    text:
      `Hi ${user.name}, your ${payload.plan} membership is now active. ` +
      "You can enter scores, take part in the monthly draw, and track charity impact from your dashboard.",
  });

  return {
    mode: "activated" as const,
    user: sanitizeUser(user, data),
  };
}

export async function cancelSubscription(userId: string) {
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (isStripeConfigured() && user.subscription.stripeSubscriptionId) {
    const subscription = await scheduleSubscriptionCancellation(
      user.subscription.stripeSubscriptionId,
    );

    await syncUserWithStripeSubscription(data, subscription, { userId: user.id });
  } else {
    applySubscriptionSnapshot(user, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
    });
  }

  await persist(data);
  void safeSendEmail({
    to: user.email,
    subject: "Subscription cancellation scheduled",
    text:
      `Hi ${user.name}, your membership cancellation has been scheduled. ` +
      "You can still sign in and review your account, and you can reactivate later if needed.",
  });

  return sanitizeUser(user, data);
}

export async function createBillingPortalLink(userId: string) {
  if (!isStripeConfigured()) {
    throw new Error("Stripe billing portal is not configured.");
  }

  const data = await readStore();
  const user = findUserById(data, userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.subscription.stripeCustomerId) {
    throw new Error("This member does not have a Stripe billing profile yet.");
  }

  const session = await createCustomerPortalSession(user.subscription.stripeCustomerId);

  return {
    url: session.url,
  };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  const data = await readStore();
  const user = await syncUserWithStripeSubscription(data, subscription, {
    userId: session.client_reference_id ?? session.metadata?.userId ?? null,
    fallbackPlan:
      (session.metadata?.plan as SubscriptionPlan | undefined) ?? undefined,
  });

  await persist(data);
  void safeSendEmail({
    to: user.email,
    subject: "Stripe checkout completed",
    text:
      `Hi ${user.name}, your checkout has completed successfully. ` +
      "Your subscription status has been synced and your dashboard is ready.",
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const data = await readStore();
  const user = await syncUserWithStripeSubscription(data, subscription);

  await persist(data);

  if (user.subscription.status === "cancelled" || user.subscription.cancelAtPeriodEnd) {
    void safeSendEmail({
      to: user.email,
      subject: "Subscription update received",
      text:
        `Hi ${user.name}, your billing subscription has been updated. ` +
        `Current status: ${user.subscription.status}.`,
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await retrieveSubscription(subscriptionId);
  const data = await readStore();
  const user = await syncUserWithStripeSubscription(data, subscription);
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString();
  const grossAmount = invoice.amount_paid > 0
    ? invoice.amount_paid / 100
    : getPlanPrice(user.subscription.plan);

  recordSubscriptionDonation(data, user, {
    amount: grossAmount * user.charityPercentage,
    createdAt: paidAt,
    referenceId: invoice.id,
  });

  await persist(data);

  void safeSendEmail({
    to: user.email,
    subject: "Payment received",
    text:
      `Hi ${user.name}, we received your subscription payment and updated your charity contribution tracking. ` +
      `Your ${user.subscription.plan} membership remains active.`,
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const data = await readStore();
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null;
  const user = findUserByStripeReference(data, {
    customerId,
    subscriptionId,
  });

  if (!user) {
    return;
  }

  applySubscriptionSnapshot(user, {
    status: "lapsed",
  });

  await persist(data);
  void safeSendEmail({
    to: user.email,
    subject: "Payment issue detected",
    text:
      `Hi ${user.name}, we could not collect your latest subscription payment. ` +
      "Please update your billing details to restore full member access.",
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const event = constructWebhookEvent(rawBody, signature);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }

  return { received: true };
}

export async function submitWinnerProof(userId: string, winnerId: string, proofUrl: string) {
  const data = await readStore();
  const winner = data.winners.find((item) => item.id === winnerId && item.userId === userId);

  if (!winner) {
    throw new Error("Winner record not found.");
  }

  winner.proofUrl = proofUrl;
  winner.verificationStatus = "pending";
  winner.reviewedAt = null;

  await persist(data);

  const user = findUserById(data, userId);
  const draw = data.draws.find((item) => item.id === winner.drawId);
  const admins = data.users.filter((item) => item.role === "admin");

  if (user && draw) {
    for (const admin of admins) {
      void safeSendEmail({
        to: admin.email,
        subject: "Winner proof uploaded",
        text:
          `${user.name} uploaded winner proof for ${draw.monthLabel}. ` +
          "Review the submission from the admin dashboard.",
      });
    }
  }

  return winner;
}

export async function getAdminDashboard() {
  const data = await readStore();
  const currentDraw = ensureCurrentDraw(data);
  const campaigns = withCampaignTotals(data);
  await persist(data);

  return {
    metrics: {
      totalUsers: data.users.length,
      activeSubscribers: getActiveUsers(data).length,
      currentPrizePool: computePrizePool(data),
      totalCharityRaised: roundCurrency(
        data.donations.reduce((sum, donation) => sum + donation.amount, 0),
      ),
      pendingWinnerProofs: data.winners.filter(
        (winner) => winner.verificationStatus === "pending",
      ).length,
      nextCarryOver: currentDraw.carryOver,
      corporateAccounts: data.users.filter((user) => user.accountType === "corporate").length,
      teamAccounts: data.users.filter((user) => user.accountType === "team").length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
    },
    reports: {
      planMix: getPlanMix(data),
      accountTypeBreakdown: getAccountTypeBreakdown(data),
      subscriptionBreakdown: getSubscriptionBreakdown(data),
      payoutTotals: getPayoutTotals(data),
      donationBreakdown: getDonationBreakdown(data),
      countryBreakdown: getCountryBreakdown(data),
      charityLeaderboard: getCharityLeaderboard(data),
      drawStats: getDrawStats(data),
      campaignSummary: getCampaignSummary(data.campaigns),
    },
    users: data.users
      .map((user) => sanitizeUser(user, data))
      .sort((left, right) => left.name.localeCompare(right.name)),
    scores: data.scores
      .slice()
      .sort(sortScoresDescending)
      .map((score) => {
        const user = data.users.find((item) => item.id === score.userId);
        return {
          ...score,
          userName: user?.name ?? "Unknown player",
        };
      }),
    charities: withCharityTotals(data),
    campaigns,
    draws: data.draws
      .slice()
      .sort((left, right) => compareAsc(parseISO(right.scheduledFor), parseISO(left.scheduledFor)))
      .map((draw) => ({
        ...draw,
        entryCount: data.entries.filter((entry) => entry.drawId === draw.id).length,
        preview: getDrawNumbers(draw).length ? getPreview(data, getDrawNumbers(draw)) : null,
      })),
    winners: data.winners
      .slice()
      .sort((left, right) => compareAsc(parseISO(right.createdAt), parseISO(left.createdAt)))
      .map((winner) => {
        const user = data.users.find((item) => item.id === winner.userId);
        const draw = data.draws.find((item) => item.id === winner.drawId);
        return {
          ...winner,
          userName: user?.name ?? "Unknown player",
          drawLabel: draw?.monthLabel ?? "Unknown draw",
        };
      }),
  };
}

export async function simulateDraw(mode: DrawMode) {
  const data = await readStore();
  const draw = ensureCurrentDraw(data);
  const numbers = mode === "algorithmic" ? generateAlgorithmicNumbers(data) : generateRandomNumbers();

  draw.mode = mode;
  draw.status = "simulated";
  draw.simulationNumbers = numbers;
  draw.simulatedAt = new Date().toISOString();

  await persist(data);

  return {
    draw,
    preview: getPreview(data, numbers),
  };
}

export async function publishDraw(drawId: string) {
  const data = await readStore();
  const draw = data.draws.find((item) => item.id === drawId);

  if (!draw) {
    throw new Error("Draw not found.");
  }

  if (draw.status === "published") {
    throw new Error("This draw has already been published.");
  }

  const numbers = draw.simulationNumbers ?? (draw.mode === "algorithmic"
    ? generateAlgorithmicNumbers(data)
    : generateRandomNumbers());
  const entries = getEligibleEntries(data);
  const prizePoolTotal = computePrizePool(data);
  const fivePool = roundCurrency(prizePoolTotal * PRIZE_SHARE_BY_MATCH[5] + draw.carryOver);
  const fourPool = roundCurrency(prizePoolTotal * PRIZE_SHARE_BY_MATCH[4]);
  const threePool = roundCurrency(prizePoolTotal * PRIZE_SHARE_BY_MATCH[3]);

  const grouped = new Map<3 | 4 | 5, typeof entries>([
    [3, []],
    [4, []],
    [5, []],
  ]);

  for (const entry of entries) {
    const matches = countMatches(entry.entry, numbers);

    if (matches === 3 || matches === 4 || matches === 5) {
      grouped.get(matches)?.push(entry);
    }
  }

  const newWinners: Winner[] = [];
  const newEntries = entries.map((entry) => ({
    id: createId("entry"),
    drawId: draw.id,
    userId: entry.user.id,
    numbers: [...entry.entry],
    createdAt: new Date().toISOString(),
  }));

  data.entries.push(...newEntries);
  const pools = new Map<3 | 4 | 5, number>([
    [3, threePool],
    [4, fourPool],
    [5, fivePool],
  ]);

  for (const matchCount of [3, 4, 5] as const) {
    const winnerEntries = grouped.get(matchCount) ?? [];
    const prizeAmount = winnerEntries.length
      ? roundCurrency((pools.get(matchCount) ?? 0) / winnerEntries.length)
      : 0;

    for (const winnerEntry of winnerEntries) {
      const winner: Winner = {
        id: createId("winner"),
        drawId: draw.id,
        userId: winnerEntry.user.id,
        matchCount,
        prizeAmount,
        proofUrl: null,
        verificationStatus: "not_submitted",
        payoutStatus: "pending",
        notes: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      };

      newWinners.push(winner);
      data.winners.push(winner);
    }
  }

  draw.numbers = numbers;
  draw.simulationNumbers = numbers;
  draw.status = "published";
  draw.prizePoolTotal = prizePoolTotal;
  draw.winnerIds = newWinners.map((winner) => winner.id);
  draw.publishedAt = new Date().toISOString();

  const nextMonth = addMonths(parseISO(draw.scheduledFor), 1);
  const nextMonthKey = getMonthKey(nextMonth);
  const nextCarryOver = grouped.get(5)?.length ? 0 : fivePool;
  const nextDraft = data.draws.find((item) => item.monthKey === nextMonthKey && item.status !== "published");

  if (nextDraft) {
    nextDraft.carryOver = roundCurrency(nextCarryOver);
  } else {
    data.draws.push(createDraftDraw(nextMonth, nextCarryOver));
  }

  await persist(data);

  const activeSubscribers = getActiveUsers(data);

  for (const member of activeSubscribers) {
    const memberWinners = newWinners.filter((winner) => winner.userId === member.id);
    const winnerSummary = memberWinners.length
      ? ` You won ${memberWinners.map((winner) => `${winner.matchCount}-match`).join(", ")} and should upload proof from your dashboard.`
      : " Results are now live in your dashboard.";

    void safeSendEmail({
      to: member.email,
      subject: `Draw results published for ${draw.monthLabel}`,
      text:
        `The ${draw.monthLabel} draw has been published with numbers ${numbers.join(", ")}.` +
        winnerSummary,
    });
  }

  return {
    draw,
    winners: newWinners,
  };
}

export async function createCharity(input: unknown) {
  const payload = charityMutationSchema.parse(input);
  const data = await readStore();
  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (data.charities.some((charity) => charity.slug === slug)) {
    throw new Error("A charity with a similar name already exists.");
  }

  const charity: Charity = {
    id: createId("charity"),
    slug,
    ...payload,
  };

  data.charities.push(charity);
  await persist(data);
  return charity;
}

export async function updateCharity(charityId: string, input: unknown) {
  const payload = charityMutationSchema.partial().parse(input);
  const data = await readStore();
  const charity = data.charities.find((item) => item.id === charityId);

  if (!charity) {
    throw new Error("Charity not found.");
  }

  Object.assign(charity, payload);

  if (payload.name) {
    charity.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  await persist(data);
  return charity;
}

export async function deleteCharity(charityId: string) {
  const data = await readStore();

  if (data.users.some((user) => user.selectedCharityId === charityId)) {
    throw new Error("This charity is assigned to one or more subscribers.");
  }

  if (data.campaigns.some((campaign) => campaign.linkedCharityIds.includes(charityId))) {
    throw new Error("This charity is linked to one or more campaigns.");
  }

  data.charities = data.charities.filter((charity) => charity.id !== charityId);
  data.donations = data.donations.filter((donation) => donation.charityId !== charityId);

  await persist(data);
  return { success: true };
}

export async function updateUserFromAdmin(userId: string, input: unknown) {
  const payload = userAdminSchema.parse(input);
  const data = await readStore();
  const user = data.users.find((item) => item.id === userId);
  const normalizedEmail = payload.email?.toLowerCase();

  if (!user) {
    throw new Error("User not found.");
  }

  if (
    normalizedEmail &&
    data.users.some(
      (item) => item.id !== userId && item.email === normalizedEmail,
    )
  ) {
    throw new Error("Another account already uses that email.");
  }

  if (payload.selectedCharityId && !data.charities.find((charity) => charity.id === payload.selectedCharityId)) {
    throw new Error("Selected charity was not found.");
  }

  if (payload.name) user.name = payload.name;
  if (normalizedEmail) user.email = normalizedEmail;
  if (payload.accountType) user.accountType = payload.accountType;
  if (payload.countryCode) user.countryCode = payload.countryCode;
  if (typeof payload.organizationName === "string") user.organizationName = payload.organizationName || null;
  if (payload.selectedCharityId) user.selectedCharityId = payload.selectedCharityId;
  if (typeof payload.charityPercentage === "number") user.charityPercentage = payload.charityPercentage;
  if (payload.role) user.role = payload.role;
  if (payload.subscriptionStatus) user.subscription.status = payload.subscriptionStatus;
  if (payload.subscriptionPlan) user.subscription.plan = payload.subscriptionPlan;

  await persist(data);
  return sanitizeUser(user, data);
}

export async function createCampaign(input: unknown) {
  const payload = campaignMutationSchema.parse(input);
  validateDate(payload.startsAt);

  if (payload.endsAt) {
    validateDate(payload.endsAt);
  }

  const data = await readStore();
  const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  if (data.campaigns.some((campaign) => campaign.slug === slug)) {
    throw new Error("A campaign with a similar name already exists.");
  }

  const linkedCharityIds = resolveLinkedCharityIds(data, payload.linkedCharityIds);

  const campaign: Campaign = {
    id: createId("campaign"),
    slug,
    name: payload.name,
    description: payload.description,
    status: payload.status,
    targetAmount: roundCurrency(payload.targetAmount),
    linkedCharityIds,
    countryCode: payload.countryCode,
    createdAt: new Date().toISOString(),
    startsAt: new Date(payload.startsAt).toISOString(),
    endsAt: payload.endsAt ? new Date(payload.endsAt).toISOString() : null,
  };

  data.campaigns.push(campaign);
  await persist(data);
  return campaign;
}

export async function updateCampaign(campaignId: string, input: unknown) {
  const payload = campaignMutationSchema.partial().parse(input);
  const data = await readStore();
  const campaign = data.campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const linkedCharityIds = payload.linkedCharityIds
    ? resolveLinkedCharityIds(data, payload.linkedCharityIds)
    : null;

  if (payload.startsAt) {
    validateDate(payload.startsAt);
    campaign.startsAt = new Date(payload.startsAt).toISOString();
  }

  if (typeof payload.endsAt === "string") {
    campaign.endsAt = payload.endsAt ? new Date(validateDate(payload.endsAt)).toISOString() : null;
  }

  if (payload.name) {
    campaign.name = payload.name;
    campaign.slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  if (payload.description) campaign.description = payload.description;
  if (payload.status) campaign.status = payload.status;
  if (typeof payload.targetAmount === "number") campaign.targetAmount = roundCurrency(payload.targetAmount);
  if (linkedCharityIds) campaign.linkedCharityIds = linkedCharityIds;
  if (payload.countryCode) campaign.countryCode = payload.countryCode;

  await persist(data);
  return campaign;
}

export async function deleteCampaign(campaignId: string) {
  const data = await readStore();
  data.campaigns = data.campaigns.filter((campaign) => campaign.id !== campaignId);
  await persist(data);
  return { success: true };
}

export async function updateScoreFromAdmin(scoreId: string, input: unknown) {
  const payload = scoreAdminSchema.parse(input);
  const data = await readStore();
  const score = data.scores.find((item) => item.id === scoreId);

  if (!score) {
    throw new Error("Score not found.");
  }

  if (typeof payload.value === "number") {
    score.value = payload.value;
  }

  if (payload.playedAt) {
    validateDate(payload.playedAt);
    score.playedAt = new Date(payload.playedAt).toISOString();
  }

  await persist(data);
  return score;
}

export async function reviewWinner(winnerId: string, input: unknown) {
  const payload = winnerReviewSchema.parse(input);
  const data = await readStore();
  const winner = data.winners.find((item) => item.id === winnerId);

  if (!winner) {
    throw new Error("Winner record not found.");
  }

  if (payload.verificationStatus) {
    winner.verificationStatus = payload.verificationStatus as VerificationStatus;
  }

  if (payload.payoutStatus) {
    winner.payoutStatus = payload.payoutStatus;
  }

  if (typeof payload.notes === "string") {
    winner.notes = payload.notes;
  }

  winner.reviewedAt = new Date().toISOString();

  await persist(data);

  const user = findUserById(data, winner.userId);
  const draw = data.draws.find((item) => item.id === winner.drawId);

  if (user) {
    void safeSendEmail({
      to: user.email,
      subject: "Winner verification updated",
      text:
        `Your ${draw?.monthLabel ?? "recent"} winner record is now ${winner.verificationStatus} ` +
        `with payout status ${winner.payoutStatus}.`,
    });
  }

  return winner;
}
