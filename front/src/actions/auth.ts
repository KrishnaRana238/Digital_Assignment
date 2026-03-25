"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requestBackend, toSessionProfile, type AuthResponse } from "@/lib/api";
import { clearSession, setSession } from "@/lib/session";

function errorRedirect(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData) {
  try {
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    const response = await requestBackend<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await setSession(toSessionProfile(response.user), response.token);
    redirect(response.user.role === "admin" ? "/admin" : "/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    errorRedirect("/login", error);
  }
}

export async function signupAction(formData: FormData) {
  try {
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      accountType: String(formData.get("accountType") ?? "individual"),
      countryCode: String(formData.get("countryCode") ?? "GB"),
      organizationName: String(formData.get("organizationName") ?? ""),
      charityId: String(formData.get("charityId") ?? ""),
      charityPercentage: Number(formData.get("charityPercentage") ?? 0.1),
      plan: String(formData.get("plan") ?? "monthly"),
    };
    const response = await requestBackend<AuthResponse>("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await setSession(toSessionProfile(response.user), response.token);
    redirect("/dashboard?welcome=1");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    errorRedirect("/signup", error);
  }
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
