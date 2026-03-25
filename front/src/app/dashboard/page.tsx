import { format } from "date-fns";
import { Award, CalendarClock, HeartHandshake, Trophy } from "lucide-react";
import {
  activateSubscriptionAction,
  addScoreAction,
  cancelSubscriptionAction,
  openBillingPortalAction,
  uploadWinnerProofAction,
  updateCharityAction,
  updateOwnScoreAction,
  updateProfileAction,
} from "@/actions/member";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMemberDashboard } from "@/lib/api";
import { requireSessionProfile, getSessionToken } from "@/lib/session";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  await requireSessionProfile();
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const dashboard = await getMemberDashboard(token);
  const billingStatus = typeof params.billing === "string" ? params.billing : null;
  const welcome = params.welcome === "1";
  const hasActiveSubscription = dashboard.user.subscription.status === "active";
  const scheduledToCancel = dashboard.user.subscription.cancelAtPeriodEnd;
  const activationLabel = scheduledToCancel
    ? "Resume membership"
    : hasActiveSubscription && dashboard.billing.stripeConfigured
      ? "Switch plan with secure checkout"
      : dashboard.billing.stripeConfigured
        ? "Continue to secure checkout"
        : "Activate subscription";

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        {welcome ? (
          <Card className="p-5">
            <p className="font-medium">Your account is ready.</p>
            <p className="mt-2 muted">
              Choose your plan and activate billing to unlock score entry and monthly draw access.
            </p>
          </Card>
        ) : null}

        {billingStatus === "success" ? (
          <Card className="p-5">
            <p className="font-medium">Billing confirmation received.</p>
            <p className="mt-2 muted">
              Your subscription is being synced. Refresh shortly if the active status does not show immediately.
            </p>
          </Card>
        ) : null}

        <section className="split">
          <div>
            <Badge>Subscriber Dashboard</Badge>
            <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Welcome back, {dashboard.user.name}
            </h1>
            <p className="mt-3 muted">
              Keep your last five scores fresh, manage your charity preference, and track reward
              eligibility in one place.
            </p>
          </div>
          <div className="cluster">
            <span className="pill">
              {dashboard.user.subscription.status} · {dashboard.user.subscription.plan}
            </span>
            <span className="pill">
              Charity share {formatPercent(dashboard.user.charityPercentage)}
            </span>
          </div>
        </section>

        <section className="stat-grid">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-[var(--secondary)]" />
              <span className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Renewal date
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {dashboard.user.subscription.renewalDate
                ? format(new Date(dashboard.user.subscription.renewalDate), "dd MMM yyyy")
                : "Inactive"}
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-[var(--primary)]" />
              <span className="text-sm uppercase tracking-[0.18em] text-slate-400">Draws entered</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">{dashboard.participation.drawsEntered}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-[var(--accent)]" />
              <span className="text-sm uppercase tracking-[0.18em] text-slate-400">Total won</span>
            </div>
            <p className="mt-4 text-3xl font-semibold">${dashboard.winnings.totalWon.toFixed(2)}</p>
          </Card>
        </section>

        <section className="dashboard-grid">
          <div className="grid gap-5">
            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge tone="accent">Profile Settings</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Identity, country, and account setup</h2>
                </div>
              </div>
              <form action={updateProfileAction} className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label htmlFor="name">Full name</label>
                    <input id="name" name="name" defaultValue={dashboard.user.name} className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={dashboard.user.email}
                      className="input"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="field">
                    <label htmlFor="accountType">Account type</label>
                    <select
                      id="accountType"
                      name="accountType"
                      defaultValue={dashboard.user.accountType}
                      className="select"
                    >
                      <option value="individual">Individual</option>
                      <option value="team">Team</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="countryCode">Country code</label>
                    <input
                      id="countryCode"
                      name="countryCode"
                      defaultValue={dashboard.user.countryCode}
                      className="input"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="organizationName">Organization</label>
                    <input
                      id="organizationName"
                      name="organizationName"
                      defaultValue={dashboard.user.organizationName ?? ""}
                      className="input"
                    />
                  </div>
                </div>
                <SubmitButton pendingLabel="Saving...">Update profile</SubmitButton>
              </form>
            </Card>

            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge tone="secondary">Subscription</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Membership state</h2>
                </div>
                <span className="pill">{dashboard.user.subscription.status}</span>
              </div>
              <p className="mt-3 muted">
                Access is restricted for inactive members, but you can reactivate immediately.
              </p>
              {scheduledToCancel ? (
                <p className="mt-3 text-sm text-[var(--accent)]">
                  Your subscription is scheduled to cancel at period end. You can resume it before the cutoff.
                </p>
              ) : null}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <form action={activateSubscriptionAction} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="field">
                    <label htmlFor="plan">Plan to activate</label>
                    <select
                      id="plan"
                      name="plan"
                      className="select"
                      defaultValue={dashboard.user.subscription.plan}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <SubmitButton pendingLabel="Redirecting...">{activationLabel}</SubmitButton>
                </form>
                <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <form action={cancelSubscriptionAction} className="flex items-end">
                    <SubmitButton
                      variant="danger"
                      pendingLabel="Updating..."
                      disabled={!hasActiveSubscription && !scheduledToCancel}
                    >
                      {dashboard.billing.stripeConfigured ? "Schedule cancellation" : "Cancel membership"}
                    </SubmitButton>
                  </form>
                  {dashboard.billing.billingPortalAvailable ? (
                    <form action={openBillingPortalAction}>
                      <SubmitButton variant="secondary" pendingLabel="Opening...">
                        Manage billing
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge>Add Scores</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Last 5 score tracker</h2>
                </div>
                <span className="pill">
                  {dashboard.user.latestScores?.length ?? 0} / 5 stored
                </span>
              </div>
              {!hasActiveSubscription ? (
                <p className="mt-4 text-sm text-[var(--accent)]">
                  Activate billing first to add or edit scores.
                </p>
              ) : null}
              <div className="mt-5 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <form action={addScoreAction} className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="field">
                    <label htmlFor="value">Stableford score</label>
                    <input
                      id="value"
                      name="value"
                      type="number"
                      min="1"
                      max="45"
                      className="input"
                      disabled={!hasActiveSubscription}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="playedAt">Date played</label>
                    <input
                      id="playedAt"
                      name="playedAt"
                      type="date"
                      className="input"
                      disabled={!hasActiveSubscription}
                      required
                    />
                  </div>
                  <SubmitButton pendingLabel="Saving..." disabled={!hasActiveSubscription}>
                    Save score
                  </SubmitButton>
                </form>

                <div className="grid gap-3">
                  {(dashboard.user.latestScores ?? []).map((score) => (
                    <form
                      key={score.id}
                      action={updateOwnScoreAction}
                      className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.1fr_0.8fr_0.8fr_auto]"
                    >
                      <div>
                        <input type="hidden" name="scoreId" value={score.id} />
                        <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                          {format(new Date(score.playedAt), "dd MMM yyyy")}
                        </p>
                        <p className="mt-1 text-lg font-semibold">Stableford {score.value}</p>
                      </div>
                      <input
                        name="value"
                        type="number"
                        min="1"
                        max="45"
                        defaultValue={score.value}
                        className="input"
                        disabled={!hasActiveSubscription}
                      />
                      <input
                        name="playedAt"
                        type="date"
                        defaultValue={score.playedAt.slice(0, 10)}
                        className="input"
                        disabled={!hasActiveSubscription}
                      />
                      <SubmitButton
                        pendingLabel="Saving..."
                        variant="secondary"
                        disabled={!hasActiveSubscription}
                      >
                        Update
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge tone="accent">Winnings & Proof</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Winner verification queue</h2>
                </div>
                <span className="pill">{dashboard.winnings.pendingPayouts} pending payouts</span>
              </div>
              <div className="mt-5 grid gap-4">
                {dashboard.winnings.entries.length ? (
                  dashboard.winnings.entries.map((winner) => (
                    <div key={winner.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                      <div className="split">
                        <div>
                          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                            {winner.drawLabel}
                          </p>
                          <p className="mt-1 text-xl font-semibold">
                            {winner.matchCount}-match · ${winner.prizeAmount.toFixed(2)}
                          </p>
                        </div>
                        <div className="cluster">
                          <span className="pill">{winner.verificationStatus}</span>
                          <span className="pill">{winner.payoutStatus}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        Upload your screenshot from the golf platform if proof has not been submitted
                        yet or needs to be replaced.
                      </p>
                      <form
                        action={uploadWinnerProofAction}
                        encType="multipart/form-data"
                        className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                      >
                        <input type="hidden" name="winnerId" value={winner.id} />
                        <input
                          name="proof"
                          type="file"
                          accept="image/*"
                          className="input"
                        />
                        <SubmitButton pendingLabel="Uploading...">Upload proof</SubmitButton>
                      </form>
                    </div>
                  ))
                ) : (
                  <p className="muted">No winning entries yet, but your dashboard is ready when they arrive.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-5">
            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge tone="secondary">Charity Settings</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Where your contribution goes</h2>
                </div>
                <HeartHandshake className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <form action={updateCharityAction} className="mt-5 grid gap-4">
                <div className="field">
                  <label htmlFor="charityId">Selected charity</label>
                  <select
                    id="charityId"
                    name="charityId"
                    defaultValue={dashboard.user.selectedCharity?.id}
                    className="select"
                  >
                    {dashboard.charities.map((charity) => (
                      <option key={charity.id} value={charity.id}>
                        {charity.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="charityPercentage">Contribution share</label>
                  <input
                    id="charityPercentage"
                    name="charityPercentage"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.01"
                    defaultValue={dashboard.user.charityPercentage}
                    className="input"
                  />
                </div>
                <SubmitButton pendingLabel="Saving...">Update charity settings</SubmitButton>
              </form>
            </Card>

            <Card className="p-6">
              <Badge>Upcoming Draw</Badge>
              <h2 className="mt-4 text-2xl font-semibold">{dashboard.upcomingDraw.monthLabel}</h2>
              <p className="mt-3 muted">
                You are {dashboard.participation.eligibleForCurrentDraw ? "currently eligible" : "not yet eligible"} for this draw.
              </p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Carryover</p>
                  <p className="mt-2 text-3xl font-semibold">${dashboard.upcomingDraw.carryOver.toFixed(2)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Current entry</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dashboard.upcomingDraw.activeEntry.length ? (
                      dashboard.upcomingDraw.activeEntry.map((value, index) => (
                        <span
                          key={`${value}-${index}`}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] font-semibold text-[var(--primary-ink)]"
                        >
                          {value}
                        </span>
                      ))
                    ) : (
                      <p className="muted">Add five scores to enter the current draw.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Badge tone="secondary">Campaigns</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Featured giving campaigns</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.campaigns.length ? (
                  dashboard.campaigns.slice(0, 3).map((campaign) => (
                    <div key={campaign.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="split">
                        <p className="font-semibold">{campaign.name}</p>
                        <span className="pill">{campaign.status}</span>
                      </div>
                      <p className="mt-2 muted">{campaign.description}</p>
                      <div className="mt-3 split text-sm text-slate-300">
                        <span>{campaign.countryCode}</span>
                        <span>
                          ${Number(campaign.raisedTotal ?? 0).toFixed(2)} / ${campaign.targetAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Campaigns are not active yet, but the module is ready for launch.</p>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
