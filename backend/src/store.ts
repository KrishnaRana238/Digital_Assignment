import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DRAW_SIZE } from "./constants.js";
import type { DataStore } from "./types.js";
import { createSeedData } from "./seed.js";

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "app-db.json");

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let supabaseClient: SupabaseClient | null = null;

type CharityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  short_description: string;
  description: string;
  image_url: string;
  gallery_images: string[] | null;
  upcoming_event: string;
  featured: boolean;
  country_code: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "subscriber" | "admin";
  account_type: "individual" | "team" | "corporate";
  country_code: string;
  organization_name: string | null;
  selected_charity_id: string;
  charity_percentage: number;
  created_at: string;
  subscription_plan: "monthly" | "yearly";
  subscription_status: "active" | "inactive" | "cancelled" | "lapsed";
  started_at: string | null;
  renewal_date: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

type ScoreRow = {
  id: string;
  user_id: string;
  value: number;
  played_at: string;
  created_at: string;
};

type DrawRow = {
  id: string;
  month_key: string;
  month_label: string;
  scheduled_for: string;
  mode: "random" | "algorithmic";
  status: "draft" | "simulated" | "published";
  carry_over: number;
  simulation_numbers: number[] | null;
  numbers: number[] | null;
  prize_pool_total: number;
  winner_ids: string[] | null;
  simulated_at: string | null;
  published_at: string | null;
};

type CampaignRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "draft" | "active" | "archived";
  target_amount: number;
  linked_charity_ids: string[] | null;
  country_code: string;
  created_at: string;
  starts_at: string;
  ends_at: string | null;
};

type DrawEntryRow = {
  id: string;
  draw_id: string;
  user_id: string;
  numbers: number[] | null;
  created_at: string;
};

type WinnerRow = {
  id: string;
  draw_id: string;
  user_id: string;
  match_count: 3 | 4 | 5;
  prize_amount: number;
  proof_url: string | null;
  verification_status: "not_submitted" | "pending" | "approved" | "rejected";
  payout_status: "pending" | "paid";
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type DonationRow = {
  id: string;
  charity_id: string;
  user_id: string | null;
  amount: number;
  donor_name: string;
  donor_email: string | null;
  kind: "subscription" | "independent";
  reference_id: string | null;
  created_at: string;
};

function isSupabaseConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      },
    );
  }

  return supabaseClient;
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => String(item))
    .filter((item) => item.length > 0);
}

function toCharityRow(data: DataStore): CharityRow[] {
  return data.charities.map((charity) => ({
    id: charity.id,
    slug: charity.slug,
    name: charity.name,
    category: charity.category,
    short_description: charity.shortDescription,
    description: charity.description,
    image_url: charity.imageUrl,
    gallery_images: charity.galleryImages,
    upcoming_event: charity.upcomingEvent,
    featured: charity.featured,
    country_code: charity.countryCode,
  }));
}

function toUserRow(data: DataStore): UserRow[] {
  return data.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role,
    account_type: user.accountType,
    country_code: user.countryCode,
    organization_name: user.organizationName,
    selected_charity_id: user.selectedCharityId,
    charity_percentage: user.charityPercentage,
    created_at: user.createdAt,
    subscription_plan: user.subscription.plan,
    subscription_status: user.subscription.status,
    started_at: user.subscription.startedAt,
    renewal_date: user.subscription.renewalDate,
    cancel_at_period_end: user.subscription.cancelAtPeriodEnd,
    stripe_customer_id: user.subscription.stripeCustomerId,
    stripe_subscription_id: user.subscription.stripeSubscriptionId,
  }));
}

function toCampaignRow(data: DataStore): CampaignRow[] {
  return data.campaigns.map((campaign) => ({
    id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    target_amount: campaign.targetAmount,
    linked_charity_ids: campaign.linkedCharityIds,
    country_code: campaign.countryCode,
    created_at: campaign.createdAt,
    starts_at: campaign.startsAt,
    ends_at: campaign.endsAt,
  }));
}

function toScoreRow(data: DataStore): ScoreRow[] {
  return data.scores.map((score) => ({
    id: score.id,
    user_id: score.userId,
    value: score.value,
    played_at: score.playedAt,
    created_at: score.createdAt,
  }));
}

function toDrawRow(data: DataStore): DrawRow[] {
  return data.draws.map((draw) => ({
    id: draw.id,
    month_key: draw.monthKey,
    month_label: draw.monthLabel,
    scheduled_for: draw.scheduledFor,
    mode: draw.mode,
    status: draw.status,
    carry_over: draw.carryOver,
    simulation_numbers: draw.simulationNumbers,
    numbers: draw.numbers,
    prize_pool_total: draw.prizePoolTotal,
    winner_ids: draw.winnerIds,
    simulated_at: draw.simulatedAt,
    published_at: draw.publishedAt,
  }));
}

function toDrawEntryRow(data: DataStore): DrawEntryRow[] {
  return data.entries.map((entry) => ({
    id: entry.id,
    draw_id: entry.drawId,
    user_id: entry.userId,
    numbers: entry.numbers,
    created_at: entry.createdAt,
  }));
}

function toWinnerRow(data: DataStore): WinnerRow[] {
  return data.winners.map((winner) => ({
    id: winner.id,
    draw_id: winner.drawId,
    user_id: winner.userId,
    match_count: winner.matchCount,
    prize_amount: winner.prizeAmount,
    proof_url: winner.proofUrl,
    verification_status: winner.verificationStatus,
    payout_status: winner.payoutStatus,
    notes: winner.notes,
    created_at: winner.createdAt,
    reviewed_at: winner.reviewedAt,
  }));
}

function toDonationRow(data: DataStore): DonationRow[] {
  return data.donations.map((donation) => ({
    id: donation.id,
    charity_id: donation.charityId,
    user_id: donation.userId,
    amount: donation.amount,
    donor_name: donation.donorName,
    donor_email: donation.donorEmail,
    kind: donation.kind,
    reference_id: donation.referenceId,
    created_at: donation.createdAt,
  }));
}

function fromRowsToStore(input: {
  charities: CharityRow[];
  users: UserRow[];
  scores: ScoreRow[];
  campaigns: CampaignRow[];
  draws: DrawRow[];
  entries: DrawEntryRow[];
  winners: WinnerRow[];
  donations: DonationRow[];
}): DataStore {
  return {
    charities: input.charities.map((charity) => ({
      id: charity.id,
      slug: charity.slug,
      name: charity.name,
      category: charity.category,
      shortDescription: charity.short_description,
      description: charity.description,
      imageUrl: charity.image_url,
      galleryImages: normalizeStringArray(charity.gallery_images) ?? [],
      upcomingEvent: charity.upcoming_event,
      featured: charity.featured,
      countryCode: charity.country_code,
    })),
    users: input.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.password_hash,
      role: user.role,
      accountType: user.account_type,
      countryCode: user.country_code,
      organizationName: user.organization_name,
      selectedCharityId: user.selected_charity_id,
      charityPercentage: Number(user.charity_percentage),
      createdAt: user.created_at,
      subscription: {
        plan: user.subscription_plan,
        status: user.subscription_status,
        startedAt: user.started_at,
        renewalDate: user.renewal_date,
        cancelAtPeriodEnd: Boolean(user.cancel_at_period_end),
        stripeCustomerId: user.stripe_customer_id,
        stripeSubscriptionId: user.stripe_subscription_id,
      },
    })),
    campaigns: input.campaigns.map((campaign) => ({
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      targetAmount: Number(campaign.target_amount),
      linkedCharityIds: normalizeStringArray(campaign.linked_charity_ids) ?? [],
      countryCode: campaign.country_code,
      createdAt: campaign.created_at,
      startsAt: campaign.starts_at,
      endsAt: campaign.ends_at,
    })),
    scores: input.scores.map((score) => ({
      id: score.id,
      userId: score.user_id,
      value: score.value,
      playedAt: score.played_at,
      createdAt: score.created_at,
    })),
    draws: input.draws.map((draw) => ({
      id: draw.id,
      monthKey: draw.month_key,
      monthLabel: draw.month_label,
      scheduledFor: draw.scheduled_for,
      mode: draw.mode,
      status: draw.status,
      carryOver: Number(draw.carry_over),
      simulationNumbers: normalizeNumberArray(draw.simulation_numbers),
      numbers: normalizeNumberArray(draw.numbers),
      prizePoolTotal: Number(draw.prize_pool_total),
      winnerIds: normalizeStringArray(draw.winner_ids) ?? [],
      simulatedAt: draw.simulated_at,
      publishedAt: draw.published_at,
    })),
    entries: input.entries.map((entry) => ({
      id: entry.id,
      drawId: entry.draw_id,
      userId: entry.user_id,
      numbers: normalizeNumberArray(entry.numbers) ?? [],
      createdAt: entry.created_at,
    })),
    winners: input.winners.map((winner) => ({
      id: winner.id,
      drawId: winner.draw_id,
      userId: winner.user_id,
      matchCount: winner.match_count,
      prizeAmount: Number(winner.prize_amount),
      proofUrl: winner.proof_url,
      verificationStatus: winner.verification_status,
      payoutStatus: winner.payout_status,
      notes: winner.notes,
      createdAt: winner.created_at,
      reviewedAt: winner.reviewed_at,
    })),
    donations: input.donations.map((donation) => ({
      id: donation.id,
      charityId: donation.charity_id,
      userId: donation.user_id,
      amount: Number(donation.amount),
      donorName: donation.donor_name,
      donorEmail: donation.donor_email,
      kind: donation.kind,
      referenceId: donation.reference_id,
      createdAt: donation.created_at,
    })),
  };
}

function normalizeStore(data: DataStore): DataStore {
  const entries = data.entries && data.entries.length > 0
    ? data.entries
    : backfillEntries(data);

  return {
    ...data,
    users: data.users.map((user) => ({
      ...user,
      accountType: user.accountType ?? "individual",
      countryCode: user.countryCode ?? "GB",
      organizationName: user.organizationName ?? null,
      subscription: {
        ...user.subscription,
        cancelAtPeriodEnd: Boolean(user.subscription.cancelAtPeriodEnd),
      },
    })),
    charities: data.charities.map((charity) => ({
      ...charity,
      galleryImages: charity.galleryImages ?? [],
      countryCode: charity.countryCode ?? "GB",
    })),
    campaigns: (data.campaigns ?? []).map((campaign) => ({
      ...campaign,
      linkedCharityIds: campaign.linkedCharityIds ?? [],
      countryCode: campaign.countryCode ?? "GB",
      endsAt: campaign.endsAt ?? null,
    })),
    donations: data.donations.map((donation) => ({
      ...donation,
      referenceId: donation.referenceId ?? null,
    })),
    entries,
  };
}

function backfillEntries(data: DataStore) {
  const entries = new Map<
    string,
    {
      id: string;
      drawId: string;
      userId: string;
      numbers: number[];
      createdAt: string;
    }
  >();

  for (const draw of data.draws.filter((item) => item.status === "published")) {
    const drawTimestamp = Date.parse(draw.publishedAt ?? draw.scheduledFor);
    const drawNumbers = draw.numbers ?? draw.simulationNumbers ?? [];

    const resolveNumbers = (userId: string) => {
      const numbers = data.scores
        .filter(
          (score) => score.userId === userId && Date.parse(score.playedAt) <= drawTimestamp,
        )
        .sort((left, right) => {
          return (
            Date.parse(right.playedAt) - Date.parse(left.playedAt) ||
            Date.parse(right.createdAt) - Date.parse(left.createdAt)
          );
        })
        .slice(0, DRAW_SIZE)
        .map((score) => score.value);

      return numbers.length === DRAW_SIZE ? numbers : drawNumbers.slice(0, DRAW_SIZE);
    };

    for (const winner of data.winners.filter((item) => item.drawId === draw.id)) {
      entries.set(`${draw.id}:${winner.userId}`, {
        id: `entry-backfill-${draw.id}-${winner.userId}`,
        drawId: draw.id,
        userId: winner.userId,
        numbers: resolveNumbers(winner.userId),
        createdAt: draw.publishedAt ?? draw.scheduledFor,
      });
    }

    for (const user of data.users.filter((item) => item.role === "subscriber")) {
      if (!user.subscription.startedAt) {
        continue;
      }

      const startedAt = Date.parse(user.subscription.startedAt);
      const renewalDate = user.subscription.renewalDate
        ? Date.parse(user.subscription.renewalDate)
        : Number.POSITIVE_INFINITY;

      if (startedAt > drawTimestamp || renewalDate < drawTimestamp) {
        continue;
      }

      const numbers = resolveNumbers(user.id);

      if (numbers.length !== DRAW_SIZE) {
        continue;
      }

      entries.set(`${draw.id}:${user.id}`, {
        id: `entry-backfill-${draw.id}-${user.id}`,
        drawId: draw.id,
        userId: user.id,
        numbers,
        createdAt: draw.publishedAt ?? draw.scheduledFor,
      });
    }
  }

  return Array.from(entries.values());
}

async function ensureJsonStore() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    const seed = await createSeedData();
    await writeFile(dataFile, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function ensureSupabaseStore() {
  const client = getSupabaseClient();

  if (!client) {
    return;
  }

  const { data, error } = await client.from("charities").select("id").limit(1);

  if (error) {
    throw new Error(
      `Supabase is configured but could not be initialized. Apply backend/supabase/schema.sql first. ${error.message}`,
    );
  }

  if (data && data.length > 0) {
    return;
  }

  const seed = await createSeedData();
  await syncSupabaseStore(seed);
}

async function syncTable<T extends { id: string }>(
  client: SupabaseClient,
  table: string,
  rows: T[],
) {
  const { data: existingRows, error: existingError } = await client.from(table).select("id");

  if (existingError) {
    throw new Error(`Failed to read ${table} from Supabase. ${existingError.message}`);
  }

  if (rows.length > 0) {
    const { error } = await client.from(table).upsert(rows as never[], { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to sync ${table} to Supabase. ${error.message}`);
    }
  }

  const existingIds = (existingRows ?? []).map((row) => String((row as { id: string }).id));
  const nextIds = new Set(rows.map((row) => row.id));
  const idsToDelete = existingIds.filter((id) => !nextIds.has(id));

  if (idsToDelete.length > 0) {
    const { error } = await client.from(table).delete().in("id", idsToDelete);

    if (error) {
      throw new Error(`Failed to clean stale ${table} rows in Supabase. ${error.message}`);
    }
  }
}

async function syncSupabaseStore(data: DataStore) {
  const client = getSupabaseClient();

  if (!client) {
    return;
  }

  const charityRows = toCharityRow(data);
  const userRows = toUserRow(data);
  const campaignRows = toCampaignRow(data);
  const drawRows = toDrawRow(data);
  const drawEntryRows = toDrawEntryRow(data);
  const scoreRows = toScoreRow(data);
  const winnerRows = toWinnerRow(data);
  const donationRows = toDonationRow(data);

  await syncTable(client, "charities", charityRows);
  await syncTable(client, "users", userRows);
  await syncTable(client, "campaigns", campaignRows);
  await syncTable(client, "draws", drawRows);
  await syncTable(client, "draw_entries", drawEntryRows);
  await syncTable(client, "scores", scoreRows);
  await syncTable(client, "winners", winnerRows);
  await syncTable(client, "donations", donationRows);
}

async function readSupabaseStore() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const [
    charitiesResult,
    usersResult,
    scoresResult,
    campaignsResult,
    drawsResult,
    drawEntriesResult,
    winnersResult,
    donationsResult,
  ] = await Promise.all([
    client.from("charities").select("*"),
    client.from("users").select("*"),
    client.from("scores").select("*"),
    client.from("campaigns").select("*"),
    client.from("draws").select("*"),
    client.from("draw_entries").select("*"),
    client.from("winners").select("*"),
    client.from("donations").select("*"),
  ]);

  const results = [
    ["charities", charitiesResult.error],
    ["users", usersResult.error],
    ["scores", scoresResult.error],
    ["campaigns", campaignsResult.error],
    ["draws", drawsResult.error],
    ["draw_entries", drawEntriesResult.error],
    ["winners", winnersResult.error],
    ["donations", donationsResult.error],
  ] as const;

  const failed = results.find(([, error]) => error);

  if (failed) {
    throw new Error(`Failed to load ${failed[0]} from Supabase. ${failed[1]?.message}`);
  }

  return fromRowsToStore({
    charities: (charitiesResult.data ?? []) as CharityRow[],
    users: (usersResult.data ?? []) as UserRow[],
    scores: (scoresResult.data ?? []) as ScoreRow[],
    campaigns: (campaignsResult.data ?? []) as CampaignRow[],
    draws: (drawsResult.data ?? []) as DrawRow[],
    entries: (drawEntriesResult.data ?? []) as DrawEntryRow[],
    winners: (winnersResult.data ?? []) as WinnerRow[],
    donations: (donationsResult.data ?? []) as DonationRow[],
  });
}

export async function ensureStore() {
  if (initialized) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (isSupabaseConfigured()) {
        await ensureSupabaseStore();
      } else {
        await ensureJsonStore();
      }

      initialized = true;
    })();
  }

  await initializationPromise;
}

export async function readStore(): Promise<DataStore> {
  await ensureStore();

  if (isSupabaseConfigured()) {
    return normalizeStore(await readSupabaseStore());
  }

  const raw = await readFile(dataFile, "utf8");
  return normalizeStore(JSON.parse(raw) as DataStore);
}

export async function writeStore(data: DataStore) {
  await ensureStore();
  const normalized = normalizeStore(data);

  if (isSupabaseConfigured()) {
    await syncSupabaseStore(normalized);
    return;
  }

  await writeFile(dataFile, JSON.stringify(normalized, null, 2), "utf8");
}

export function getStoreMode() {
  return isSupabaseConfigured() ? "supabase" : "local-json";
}
