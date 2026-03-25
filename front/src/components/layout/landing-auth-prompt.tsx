"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LockKeyhole, UserPlus, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

const DISMISS_KEY = "good_lie_landing_prompt_dismissed";
const PROMPT_DELAY_MS = 10_000;

export function LandingAuthPrompt({
  enabled,
}: {
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (window.sessionStorage.getItem(DISMISS_KEY) === "1") {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled]);

  function handleDismiss() {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  if (!enabled || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,1,2,0.78)] px-4 backdrop-blur-md">
      <div className="surface-strong relative w-full max-w-xl rounded-[2rem] p-7 md:p-9">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.06)] text-slate-300 transition hover:bg-[rgba(255,70,85,0.12)] hover:text-white"
          aria-label="Close sign in prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5">
          <div className="eyebrow">Continue Your Journey</div>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Create an account or sign in to unlock scores, draws, and charity tracking.
            </h2>
            <p className="section-copy">
              You have seen the story of the platform. The next step is to enter your latest five
              scores, choose your charity, and move into the member dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/login" className={buttonStyles({ variant: "secondary", className: "w-full" })}>
              <LockKeyhole className="h-4 w-4" />
              Login
            </Link>
            <Link href="/signup" className={buttonStyles({ className: "w-full" })}>
              <UserPlus className="h-4 w-4" />
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
