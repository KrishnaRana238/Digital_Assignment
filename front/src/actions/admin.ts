"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestBackend } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

function parseLines(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function requireAdminToken() {
  const token = await getSessionToken();

  if (!token) {
    redirect("/login");
  }

  return token;
}

export async function simulateDrawAction(formData: FormData) {
  const token = await requireAdminToken();

  await requestBackend(
    "/api/admin/draws/simulate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: String(formData.get("mode") ?? "random"),
      }),
    },
    token,
  );

  revalidatePath("/admin");
}

export async function publishDrawAction(formData: FormData) {
  const token = await requireAdminToken();

  await requestBackend(
    "/api/admin/draws/publish",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drawId: String(formData.get("drawId") ?? ""),
      }),
    },
    token,
  );

  revalidatePath("/admin");
}

export async function createCharityAction(formData: FormData) {
  const token = await requireAdminToken();

  await requestBackend(
    "/api/admin/charities",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        category: String(formData.get("category") ?? ""),
        shortDescription: String(formData.get("shortDescription") ?? ""),
        description: String(formData.get("description") ?? ""),
        imageUrl: String(formData.get("imageUrl") ?? ""),
        galleryImages: parseLines(formData.get("galleryImages")),
        upcomingEvent: String(formData.get("upcomingEvent") ?? ""),
        featured: formData.get("featured") === "on",
        countryCode: String(formData.get("countryCode") ?? "GB"),
      }),
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function updateExistingCharityAction(formData: FormData) {
  const token = await requireAdminToken();
  const charityId = String(formData.get("charityId") ?? "");

  await requestBackend(
    `/api/admin/charities/${charityId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        category: String(formData.get("category") ?? ""),
        shortDescription: String(formData.get("shortDescription") ?? ""),
        description: String(formData.get("description") ?? ""),
        imageUrl: String(formData.get("imageUrl") ?? ""),
        galleryImages: parseLines(formData.get("galleryImages")),
        upcomingEvent: String(formData.get("upcomingEvent") ?? ""),
        featured: formData.get("featured") === "on",
        countryCode: String(formData.get("countryCode") ?? "GB"),
      }),
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/");
}

export async function deleteCharityAction(formData: FormData) {
  const token = await requireAdminToken();
  const charityId = String(formData.get("charityId") ?? "");

  await requestBackend(
    `/api/admin/charities/${charityId}`,
    {
      method: "DELETE",
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/charities");
  revalidatePath("/");
}

export async function updateUserAction(formData: FormData) {
  const token = await requireAdminToken();
  const userId = String(formData.get("userId") ?? "");

  await requestBackend(
    `/api/admin/users/${userId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        accountType: String(formData.get("accountType") ?? "individual"),
        countryCode: String(formData.get("countryCode") ?? "GB"),
        organizationName: String(formData.get("organizationName") ?? ""),
        selectedCharityId: String(formData.get("selectedCharityId") ?? ""),
        role: String(formData.get("role") ?? ""),
        subscriptionStatus: String(formData.get("subscriptionStatus") ?? ""),
        subscriptionPlan: String(formData.get("subscriptionPlan") ?? ""),
        charityPercentage: Number(formData.get("charityPercentage") ?? 0.1),
      }),
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function createCampaignAction(formData: FormData) {
  const token = await requireAdminToken();

  await requestBackend(
    "/api/admin/campaigns",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        status: String(formData.get("status") ?? "draft"),
        targetAmount: Number(formData.get("targetAmount") ?? 0),
        linkedCharityIds: parseLines(formData.get("linkedCharityIds")),
        countryCode: String(formData.get("countryCode") ?? "GB"),
        startsAt: String(formData.get("startsAt") ?? ""),
        endsAt: String(formData.get("endsAt") ?? ""),
      }),
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function updateCampaignAction(formData: FormData) {
  const token = await requireAdminToken();
  const campaignId = String(formData.get("campaignId") ?? "");

  await requestBackend(
    `/api/admin/campaigns/${campaignId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        status: String(formData.get("status") ?? "draft"),
        targetAmount: Number(formData.get("targetAmount") ?? 0),
        linkedCharityIds: parseLines(formData.get("linkedCharityIds")),
        countryCode: String(formData.get("countryCode") ?? "GB"),
        startsAt: String(formData.get("startsAt") ?? ""),
        endsAt: String(formData.get("endsAt") ?? ""),
      }),
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function deleteCampaignAction(formData: FormData) {
  const token = await requireAdminToken();
  const campaignId = String(formData.get("campaignId") ?? "");

  await requestBackend(
    `/api/admin/campaigns/${campaignId}`,
    {
      method: "DELETE",
    },
    token,
  );

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function updateScoreAction(formData: FormData) {
  const token = await requireAdminToken();
  const scoreId = String(formData.get("scoreId") ?? "");

  await requestBackend(
    `/api/admin/scores/${scoreId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: Number(formData.get("value") ?? 0),
        playedAt: String(formData.get("playedAt") ?? ""),
      }),
    },
    token,
  );

  revalidatePath("/admin");
}

export async function reviewWinnerAction(formData: FormData) {
  const token = await requireAdminToken();
  const winnerId = String(formData.get("winnerId") ?? "");

  await requestBackend(
    `/api/admin/winners/${winnerId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verificationStatus: String(formData.get("verificationStatus") ?? ""),
        payoutStatus: String(formData.get("payoutStatus") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      }),
    },
    token,
  );

  revalidatePath("/admin");
}
