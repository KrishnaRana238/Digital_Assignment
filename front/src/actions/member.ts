"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requestBackend, toSessionProfile } from "@/lib/api";
import { getSessionToken, setSession } from "@/lib/session";
import type { UserSummary } from "@/lib/types";

function isFileLike(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "size" in value &&
      typeof value.size === "number" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function",
  );
}

async function requireToken() {
  const token = await getSessionToken();

  if (!token) {
    redirect("/login");
  }

  return token;
}

export async function addScoreAction(formData: FormData) {
  const token = await requireToken();

  await requestBackend(
    "/api/me/scores",
    {
      method: "POST",
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

  revalidatePath("/dashboard");
}

export async function updateOwnScoreAction(formData: FormData) {
  const token = await requireToken();
  const scoreId = String(formData.get("scoreId") ?? "");

  await requestBackend(
    `/api/me/scores/${scoreId}`,
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

  revalidatePath("/dashboard");
}

export async function updateCharityAction(formData: FormData) {
  const token = await requireToken();

  await requestBackend(
    "/api/me/charity",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        charityId: String(formData.get("charityId") ?? ""),
        charityPercentage: Number(formData.get("charityPercentage") ?? 0.1),
      }),
    },
    token,
  );

  revalidatePath("/dashboard");
}

export async function updateProfileAction(formData: FormData) {
  const token = await requireToken();

  const user = await requestBackend<UserSummary>(
    "/api/me/profile",
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
      }),
    },
    token,
  );

  await setSession(toSessionProfile(user), token);
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function activateSubscriptionAction(formData: FormData) {
  const token = await requireToken();

  const response = await requestBackend<{
    mode: "activated" | "checkout";
    checkoutUrl?: string;
  }>(
    "/api/me/subscription/activate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: String(formData.get("plan") ?? "monthly"),
      }),
    },
    token,
  );

  if (response.mode === "checkout" && response.checkoutUrl) {
    redirect(response.checkoutUrl);
  }

  revalidatePath("/dashboard");
}

export async function cancelSubscriptionAction() {
  const token = await requireToken();

  await requestBackend(
    "/api/me/subscription/cancel",
    {
      method: "POST",
    },
    token,
  );

  revalidatePath("/dashboard");
}

export async function openBillingPortalAction() {
  const token = await requireToken();
  const response = await requestBackend<{ url: string }>(
    "/api/me/subscription/portal",
    {
      method: "POST",
    },
    token,
  );

  redirect(response.url);
}

export async function submitDonationAction(formData: FormData) {
  await requestBackend("/api/public/donations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      donorName: String(formData.get("donorName") ?? ""),
      donorEmail: String(formData.get("donorEmail") ?? ""),
      charityId: String(formData.get("charityId") ?? ""),
      amount: Number(formData.get("amount") ?? 0),
    }),
  });

  revalidatePath("/charities");
}

export async function uploadWinnerProofAction(formData: FormData) {
  const token = await requireToken();
  const uploadData = new FormData();
  const winnerId = String(formData.get("winnerId") ?? "");
  const proof = formData.get("proof");

  uploadData.set("winnerId", winnerId);

  if (isFileLike(proof) && proof.size > 0) {
    const filename =
      "name" in proof && typeof proof.name === "string" && proof.name.trim()
        ? proof.name
        : "winner-proof.png";

    uploadData.set("proof", proof, filename);
  } else {
    throw new Error("Please choose an image file before uploading.");
  }

  await requestBackend(
    "/api/me/winner-proofs",
    {
      method: "POST",
      body: uploadData,
    },
    token,
  );

  revalidatePath("/dashboard");
}
