import Link from "next/link";
import { LayoutDashboard, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { getSessionProfile } from "@/lib/session";
import { Button, buttonStyles } from "@/components/ui/button";

export async function SiteHeader() {
  const profile = await getSessionProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(255,70,85,0.12)] bg-[rgba(6,2,3,0.82)] backdrop-blur-xl">
      <div className="page-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--primary)_0%,#b51421_100%)] text-[var(--primary-ink)]">
            GL
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--text-soft)]">
              Good Lie Club
            </p>
            <p className="text-sm text-slate-300">Play, give, win</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          <Link href="/charities" className="text-sm text-slate-300 transition hover:text-white">
            Charities
          </Link>
          <Link href="/draws" className="text-sm text-slate-300 transition hover:text-white">
            Draws
          </Link>
          <Link href="/pricing" className="text-sm text-slate-300 transition hover:text-white">
            Pricing
          </Link>
          {profile ? (
            <>
              <Link href="/dashboard" className={buttonStyles({ variant: "ghost" })}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              {profile.role === "admin" ? (
                <Link href="/admin" className={buttonStyles({ variant: "secondary" })}>
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              ) : null}
              <form action={logoutAction}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonStyles({ variant: "ghost" })}>
                Login
              </Link>
              <Link href="/signup" className={buttonStyles()}>
                Join now
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
