import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Gift,
  HandHeart,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { getPublicOverview } from "@/lib/api";
import { LandingAuthPrompt } from "@/components/layout/landing-auth-prompt";
import { getSessionProfile } from "@/lib/session";
import { logoutAction } from "@/actions/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const overview = await getPublicOverview();
  const profile = await getSessionProfile();

  return (
    <main className="shell-pad">
      <LandingAuthPrompt enabled={!profile} />
      <div className="page-shell space-y-8">
        <section className="hero-grid">
          <Card className="landing-stage hero-card p-8 md:p-10">
            <div className="space-y-6">
              <Badge>Bold Golf. Real Impact. Monthly Rewards.</Badge>
              <div className="space-y-4">
                <h1
                  className="headline"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  A darker, sharper home for golf scores, giving, and prize energy.
                </h1>
                <p className="section-copy text-lg">
                  Good Lie Club turns your latest five Stableford scores into a monthly reward
                  entry while a slice of every subscription backs a charity you actually care about.
                </p>
              </div>
              <div className="cluster">
                {profile ? (
                  <>
                    <Link href="/dashboard" className={buttonStyles()}>
                      Open Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <form action={logoutAction}>
                      <Button type="submit" variant="secondary">
                        Logout
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={buttonStyles()}>
                      Login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/signup" className={buttonStyles({ variant: "secondary" })}>
                      Create Account
                    </Link>
                  </>
                )}
              </div>
              <div className="stat-grid">
                <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.06)] p-4">
                  <p className="kpi-value">{overview.stats.activeSubscribers}</p>
                  <p className="muted">active subscribers funding this month</p>
                </div>
                <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.06)] p-4">
                  <p className="kpi-value">${overview.stats.currentPrizePool.toFixed(2)}</p>
                  <p className="muted">current prize pool in motion</p>
                </div>
                <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.06)] p-4">
                  <p className="kpi-value">${overview.stats.totalCharityRaised.toFixed(2)}</p>
                  <p className="muted">donated across community partners</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="p-6">
              <div className="split">
                <Badge tone="accent">Current Draw</Badge>
                <span className="pill">{overview.currentDraw.monthLabel}</span>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Carryover</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight">
                    ${overview.currentDraw.carryOver.toFixed(2)}
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                    <Target className="mt-1 h-5 w-5 text-[var(--secondary)]" />
                    <div>
                      <p className="font-medium">Last 5 scores become your entry</p>
                      <p className="muted text-sm">
                        Scores are retained automatically and always shown in reverse
                        chronological order.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                    <Gift className="mt-1 h-5 w-5 text-[var(--primary)]" />
                    <div>
                      <p className="font-medium">5, 4, and 3 match prize tiers</p>
                      <p className="muted text-sm">
                        Jackpot rolls forward if no one lands the full five-number match.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                    <HandHeart className="mt-1 h-5 w-5 text-[var(--accent)]" />
                    <div>
                      <p className="font-medium">Your chosen charity receives a share</p>
                      <p className="muted text-sm">
                        Minimum charity allocation starts at 10% and can be increased any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="split">
                <Badge tone="secondary">Plans</Badge>
                <CircleDollarSign className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Monthly</p>
                  <p className="mt-1 text-3xl font-semibold">${overview.pricing.monthly}</p>
                </div>
                <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Yearly</p>
                  <p className="mt-1 text-3xl font-semibold">${overview.pricing.yearly}</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid-auto">
          {[
            {
              icon: Sparkles,
              title: "Emotion-first onboarding",
              copy: "The first thing members see is the impact of their subscription, not golf clichés.",
            },
            {
              icon: Gift,
              title: "Monthly draw engine",
              copy: "Simulate, analyze, then publish draws with full admin control and jackpot rollover logic.",
            },
            {
              icon: HandHeart,
              title: "Charity-led positioning",
              copy: "Each subscriber selects a charity at signup and can raise their contribution percentage later.",
            },
          ].map((item) => (
            <Card key={item.title} className="p-6">
              <item.icon className="h-6 w-6 text-[var(--primary)]" />
              <h2 className="mt-5 text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 muted">{item.copy}</p>
            </Card>
          ))}
        </section>

        <section className="space-y-5">
          <div className="split">
            <div>
              <p className="eyebrow">Featured Charities</p>
              <h2 className="section-title mt-4" style={{ fontFamily: "var(--font-display)" }}>
                The platform leads with impact, then makes the game feel rewarding.
              </h2>
            </div>
            <Link href="/charities" className={buttonStyles({ variant: "ghost" })}>
              Explore All Charities
            </Link>
          </div>

          <div className="grid-auto">
            {overview.featuredCharities.map((charity) => (
              <Card key={charity.id} className="overflow-hidden">
                <img
                  src={charity.imageUrl}
                  alt={charity.name}
                  className="h-52 w-full object-cover"
                />
                <div className="space-y-3 p-6">
                  <div className="split">
                    <Badge tone="secondary">{charity.category}</Badge>
                    <span className="pill">${(charity.raisedTotal ?? 0).toFixed(2)} raised</span>
                  </div>
                  <h3 className="text-2xl font-semibold">{charity.name}</h3>
                  <p className="muted">{charity.shortDescription}</p>
                  <p className="text-sm text-slate-300">{charity.upcomingEvent}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {overview.featuredCampaigns.length ? (
          <section className="space-y-5">
            <div className="split">
              <div>
                <p className="eyebrow">Campaign Layer</p>
                <h2 className="section-title mt-4" style={{ fontFamily: "var(--font-display)" }}>
                  Built for expansion into national pushes, corporate teams, and timed impact drives.
                </h2>
              </div>
              <span className="pill">{overview.featuredCampaigns.length} featured campaigns</span>
            </div>

            <div className="grid-auto">
              {overview.featuredCampaigns.map((campaign) => (
                <Card key={campaign.id} className="p-6">
                  <div className="split">
                    <div className="cluster">
                      <Badge tone={campaign.status === "active" ? "accent" : "secondary"}>
                        {campaign.status}
                      </Badge>
                      <span className="pill">{campaign.countryCode}</span>
                    </div>
                    <Target className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">{campaign.name}</h3>
                  <p className="mt-3 muted">{campaign.description}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Raised so far</p>
                      <p className="mt-2 text-2xl font-semibold">${(campaign.raisedTotal ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-3xl border border-[rgba(255,70,85,0.12)] bg-[rgba(255,70,85,0.05)] p-4">
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Target</p>
                      <p className="mt-2 text-2xl font-semibold">${campaign.targetAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <Card className="landing-stage p-7 md:p-9">
            <div className="split">
              <div className="space-y-3">
                <Badge tone="accent">Landing First</Badge>
                <h2 className="section-title" style={{ fontFamily: "var(--font-display)" }}>
                  The first screen stays the landing page. From here, users can log in, create an account, or log out.
                </h2>
                <p className="section-copy">
                  That keeps the website introduction visible first, then moves people into auth only when they decide to continue.
                </p>
              </div>
              <div className="cluster">
                {profile ? (
                  <>
                    <Link href="/dashboard" className={buttonStyles()}>
                      Dashboard
                    </Link>
                    <form action={logoutAction}>
                      <Button type="submit" variant="ghost">
                        Logout
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={buttonStyles()}>
                      Login
                    </Link>
                    <Link href="/signup" className={buttonStyles({ variant: "secondary" })}>
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
