import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionProfile } from "./types";

const SESSION_COOKIE = "good_lie_session";
const PROFILE_COOKIE = "good_lie_profile";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function encodeProfile(profile: SessionProfile) {
  return Buffer.from(JSON.stringify(profile), "utf8").toString("base64url");
}

function decodeProfile(raw: string) {
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionProfile;
}

export async function setSession(profile: SessionProfile, token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  cookieStore.set(PROFILE_COOKIE, encodeProfile(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PROFILE_COOKIE);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSessionProfile() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PROFILE_COOKIE)?.value;
  return raw ? decodeProfile(raw) : null;
}

export async function requireSessionProfile() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireAdminProfile() {
  const profile = await requireSessionProfile();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}
