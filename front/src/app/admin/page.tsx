import { format } from "date-fns";
import {
  createCampaignAction,
  createCharityAction,
  deleteCampaignAction,
  deleteCharityAction,
  publishDrawAction,
  reviewWinnerAction,
  simulateDrawAction,
  updateCampaignAction,
  updateExistingCharityAction,
  updateScoreAction,
  updateUserAction,
} from "@/actions/admin";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminDashboard } from "@/lib/api";
import { getSessionToken, requireAdminProfile } from "@/lib/session";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toMultilineValue(values: string[]) {
  return values.join("\n");
}

export default async function AdminPage() {
  await requireAdminProfile();
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const dashboard = await getAdminDashboard(token);
  const currentDraft = dashboard.draws.find((draw) => draw.status !== "published");
  const charityLookup = new Map(dashboard.charities.map((charity) => [charity.id, charity]));

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        <section className="split">
          <div>
            <Badge tone="accent">Administrator</Badge>
            <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Operations hub for subscriptions, draws, charities, winners, and campaigns
            </h1>
            <p className="mt-3 muted">
              This workspace covers the full operating surface: user management, score control,
              payout review, campaign planning, and reporting across country and plan mix.
            </p>
          </div>
          <div className="cluster">
            <span className="pill">{dashboard.metrics.totalUsers} users</span>
            <span className="pill">${dashboard.metrics.currentPrizePool.toFixed(2)} prize pool</span>
            <span className="pill">{dashboard.metrics.pendingWinnerProofs} pending proofs</span>
          </div>
        </section>

        <section className="stat-grid">
          {[
            ["Active subscribers", dashboard.metrics.activeSubscribers],
            ["Total charity raised", `$${dashboard.metrics.totalCharityRaised.toFixed(2)}`],
            ["Carryover", `$${dashboard.metrics.nextCarryOver.toFixed(2)}`],
            ["Corporate accounts", dashboard.metrics.corporateAccounts],
            ["Team accounts", dashboard.metrics.teamAccounts],
            ["Active campaigns", dashboard.metrics.activeCampaigns],
          ].map(([label, value]) => (
            <Card key={label} className="p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <p className="mt-4 text-3xl font-semibold">{value}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="p-6">
            <Badge tone="secondary">Plan Mix</Badge>
            <div className="mt-5 grid gap-3">
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Monthly</span>
                <span className="font-semibold">{dashboard.reports.planMix.monthly}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Yearly</span>
                <span className="font-semibold">{dashboard.reports.planMix.yearly}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="accent">Donation Split</Badge>
            <div className="mt-5 grid gap-3">
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Subscription donations</span>
                <span className="font-semibold">
                  ${dashboard.reports.donationBreakdown.subscription.toFixed(2)}
                </span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Independent donations</span>
                <span className="font-semibold">
                  ${dashboard.reports.donationBreakdown.independent.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Badge>Draw Stats</Badge>
            <div className="mt-5 grid gap-3">
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Published draws</span>
                <span className="font-semibold">{dashboard.reports.drawStats.publishedDraws}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Simulated draws</span>
                <span className="font-semibold">{dashboard.reports.drawStats.simulatedDraws}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Average entries</span>
                <span className="font-semibold">{dashboard.reports.drawStats.averageEntries}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Total winners</span>
                <span className="font-semibold">{dashboard.reports.drawStats.totalWinners}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-4">
          <Card className="p-6">
            <Badge tone="secondary">Account Types</Badge>
            <div className="mt-5 grid gap-3">
              {dashboard.reports.accountTypeBreakdown.map((item) => (
                <div key={item.type} className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                  <span className="capitalize">{item.type}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="accent">Subscription Status</Badge>
            <div className="mt-5 grid gap-3">
              {dashboard.reports.subscriptionBreakdown.map((item) => (
                <div key={item.status} className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                  <span className="capitalize">{item.status}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="secondary">Payout Totals</Badge>
            <div className="mt-5 grid gap-3">
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Pending</span>
                <span className="font-semibold">
                  ${dashboard.reports.payoutTotals.pendingAmount.toFixed(2)}
                </span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Paid</span>
                <span className="font-semibold">
                  ${dashboard.reports.payoutTotals.paidAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Badge>Campaign Summary</Badge>
            <div className="mt-5 grid gap-3">
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Active</span>
                <span className="font-semibold">{dashboard.reports.campaignSummary.active}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Draft</span>
                <span className="font-semibold">{dashboard.reports.campaignSummary.draft}</span>
              </div>
              <div className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                <span>Archived</span>
                <span className="font-semibold">{dashboard.reports.campaignSummary.archived}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-6">
            <Badge tone="secondary">Country Footprint</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Member distribution</h2>
            <div className="mt-5 grid gap-3">
              {dashboard.reports.countryBreakdown.slice(0, 6).map((item) => (
                <div key={item.countryCode} className="split rounded-3xl border border-white/10 bg-white/5 p-4">
                  <span>{item.countryCode}</span>
                  <span className="font-semibold">{item.members} members</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="accent">Charity Leaderboard</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Top funded partners</h2>
            <div className="mt-5 grid gap-3">
              {dashboard.reports.charityLeaderboard.map((item) => (
                <div key={item.charityId} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="split">
                    <span className="font-medium">{item.name}</span>
                    <span className="pill">{item.supporters} supporters</span>
                  </div>
                  <p className="mt-3 text-xl font-semibold">${item.totalRaised.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="grid gap-6">
            <Card className="p-6">
              <div className="split">
                <div>
                  <Badge>Draw Controls</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">Simulate and publish</h2>
                </div>
                {currentDraft ? <span className="pill">{currentDraft.monthLabel}</span> : null}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <form action={simulateDrawAction} className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="field">
                    <label htmlFor="mode">Simulation mode</label>
                    <select id="mode" name="mode" className="select" defaultValue="algorithmic">
                      <option value="random">Random</option>
                      <option value="algorithmic">Algorithmic</option>
                    </select>
                  </div>
                  <SubmitButton pendingLabel="Simulating...">Run simulation</SubmitButton>
                </form>

                {currentDraft ? (
                  <form action={publishDrawAction} className="flex items-end rounded-3xl border border-white/10 bg-white/5 p-4">
                    <input type="hidden" name="drawId" value={currentDraft.id} />
                    <SubmitButton pendingLabel="Publishing..." variant="secondary">
                      Publish draw
                    </SubmitButton>
                  </form>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4">
                {dashboard.draws.slice(0, 3).map((draw) => (
                  <div key={draw.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="split">
                      <p className="font-semibold">{draw.monthLabel}</p>
                      <span className="pill">{draw.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(draw.simulationNumbers ?? draw.numbers ?? []).map((value, index) => (
                        <span
                          key={`${draw.id}-${value}-${index}`}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-semibold text-[var(--primary-ink)]"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                    {draw.preview ? (
                      <p className="mt-3 text-sm text-slate-300">
                        Preview: {draw.entryCount ?? 0} entries, {draw.preview.three} x 3-match,{" "}
                        {draw.preview.four} x 4-match, {draw.preview.five} x 5-match
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <Badge tone="secondary">Charity Management</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Add a new charity</h2>
              <form action={createCharityAction} className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="category">Category</label>
                    <input id="category" name="category" className="input" required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="shortDescription">Short description</label>
                  <input id="shortDescription" name="shortDescription" className="input" required />
                </div>
                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" name="description" className="textarea" required />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="field">
                    <label htmlFor="imageUrl">Hero image URL</label>
                    <input id="imageUrl" name="imageUrl" type="url" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="upcomingEvent">Upcoming event</label>
                    <input id="upcomingEvent" name="upcomingEvent" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="countryCode">Country code</label>
                    <input id="countryCode" name="countryCode" className="input" defaultValue="GB" required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="galleryImages">Gallery image URLs</label>
                  <textarea
                    id="galleryImages"
                    name="galleryImages"
                    className="textarea"
                    placeholder={"https://...\nhttps://..."}
                  />
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" name="featured" className="h-4 w-4 accent-[var(--primary)]" />
                  Feature this charity on the homepage
                </label>
                <SubmitButton pendingLabel="Creating...">Create charity</SubmitButton>
              </form>
            </Card>

            <Card className="p-6">
              <Badge tone="secondary">Edit Charities</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Update content, gallery media, or retire a charity</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.charities.map((charity) => (
                  <div key={charity.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="split">
                      <div>
                        <p className="font-semibold">{charity.name}</p>
                        <p className="text-sm text-slate-400">
                          ${(charity.raisedTotal ?? 0).toFixed(2)} raised · {charity.subscriberCount ?? 0} supporters
                        </p>
                      </div>
                      <div className="cluster">
                        <span className="pill">{charity.category}</span>
                        <span className="pill">{charity.countryCode}</span>
                      </div>
                    </div>

                    <form action={updateExistingCharityAction} className="mt-4 grid gap-4">
                      <input type="hidden" name="charityId" value={charity.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="field">
                          <label>Name</label>
                          <input name="name" defaultValue={charity.name} className="input" required />
                        </div>
                        <div className="field">
                          <label>Category</label>
                          <input name="category" defaultValue={charity.category} className="input" required />
                        </div>
                      </div>
                      <div className="field">
                        <label>Short description</label>
                        <input
                          name="shortDescription"
                          defaultValue={charity.shortDescription}
                          className="input"
                          required
                        />
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <textarea
                          name="description"
                          defaultValue={charity.description}
                          className="textarea"
                          required
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="field">
                          <label>Hero image URL</label>
                          <input name="imageUrl" defaultValue={charity.imageUrl} className="input" required />
                        </div>
                        <div className="field">
                          <label>Upcoming event</label>
                          <input
                            name="upcomingEvent"
                            defaultValue={charity.upcomingEvent}
                            className="input"
                            required
                          />
                        </div>
                        <div className="field">
                          <label>Country code</label>
                          <input name="countryCode" defaultValue={charity.countryCode} className="input" required />
                        </div>
                      </div>
                      <div className="field">
                        <label>Gallery image URLs</label>
                        <textarea
                          name="galleryImages"
                          defaultValue={toMultilineValue(charity.galleryImages)}
                          className="textarea"
                        />
                      </div>
                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          name="featured"
                          defaultChecked={charity.featured}
                          className="h-4 w-4 accent-[var(--primary)]"
                        />
                        Feature on homepage
                      </label>
                      <div>
                        <SubmitButton pendingLabel="Saving..." variant="secondary">
                          Save charity
                        </SubmitButton>
                      </div>
                    </form>

                    {(charity.subscriberCount ?? 0) === 0 ? (
                      <form action={deleteCharityAction} className="mt-3">
                        <input type="hidden" name="charityId" value={charity.id} />
                        <SubmitButton pendingLabel="Deleting..." variant="danger">
                          Delete charity
                        </SubmitButton>
                      </form>
                    ) : (
                      <p className="mt-3 text-sm text-slate-400">
                        Remove supporters before deleting this charity.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <Badge tone="accent">Campaign Management</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Build future-ready impact campaigns</h2>
              <form action={createCampaignAction} className="mt-5 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label htmlFor="campaignName">Campaign name</label>
                    <input id="campaignName" name="name" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="campaignStatus">Status</label>
                    <select id="campaignStatus" name="status" className="select" defaultValue="draft">
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="campaignDescription">Description</label>
                  <textarea id="campaignDescription" name="description" className="textarea" required />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="field">
                    <label htmlFor="targetAmount">Target amount</label>
                    <input id="targetAmount" name="targetAmount" type="number" step="0.01" min="0" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="campaignCountry">Country code</label>
                    <input id="campaignCountry" name="countryCode" className="input" defaultValue="GB" required />
                  </div>
                  <div className="field">
                    <label htmlFor="startsAt">Starts</label>
                    <input id="startsAt" name="startsAt" type="date" className="input" required />
                  </div>
                  <div className="field">
                    <label htmlFor="endsAt">Ends</label>
                    <input id="endsAt" name="endsAt" type="date" className="input" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="linkedCharityIds">Linked charities</label>
                  <textarea
                    id="linkedCharityIds"
                    name="linkedCharityIds"
                    className="textarea"
                    placeholder={"charity slug or id, one per line\nexample-charity"}
                    required
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    Available charity slugs: {dashboard.charities.map((charity) => charity.slug).join(", ")}
                  </p>
                </div>
                <SubmitButton pendingLabel="Creating...">Create campaign</SubmitButton>
              </form>

              <div className="mt-6 grid gap-4">
                {dashboard.campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="split">
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <p className="text-sm text-slate-400">
                          ${campaign.raisedTotal?.toFixed(2) ?? "0.00"} raised · {campaign.supporterCount ?? 0} supporters
                        </p>
                      </div>
                      <div className="cluster">
                        <span className="pill">{campaign.status}</span>
                        <span className="pill">{campaign.countryCode}</span>
                      </div>
                    </div>

                    <form action={updateCampaignAction} className="mt-4 grid gap-4">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="field">
                          <label>Name</label>
                          <input name="name" defaultValue={campaign.name} className="input" required />
                        </div>
                        <div className="field">
                          <label>Status</label>
                          <select name="status" defaultValue={campaign.status} className="select">
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <textarea name="description" defaultValue={campaign.description} className="textarea" required />
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="field">
                          <label>Target amount</label>
                          <input
                            name="targetAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={campaign.targetAmount}
                            className="input"
                            required
                          />
                        </div>
                        <div className="field">
                          <label>Country code</label>
                          <input name="countryCode" defaultValue={campaign.countryCode} className="input" required />
                        </div>
                        <div className="field">
                          <label>Starts</label>
                          <input name="startsAt" type="date" defaultValue={toDateInputValue(campaign.startsAt)} className="input" required />
                        </div>
                        <div className="field">
                          <label>Ends</label>
                          <input name="endsAt" type="date" defaultValue={toDateInputValue(campaign.endsAt)} className="input" />
                        </div>
                      </div>
                      <div className="field">
                        <label>Linked charities</label>
                        <textarea
                          name="linkedCharityIds"
                          defaultValue={toMultilineValue(
                            campaign.linkedCharityIds.map(
                              (id) => charityLookup.get(id)?.slug ?? id,
                            ),
                          )}
                          className="textarea"
                          required
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                        {campaign.linkedCharityIds.map((id) => (
                          <span key={`${campaign.id}-${id}`} className="pill">
                            {charityLookup.get(id)?.name ?? id}
                          </span>
                        ))}
                      </div>
                      <div className="cluster">
                        <SubmitButton pendingLabel="Saving..." variant="secondary">
                          Save campaign
                        </SubmitButton>
                      </div>
                    </form>

                    <form action={deleteCampaignAction} className="mt-3">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <SubmitButton pendingLabel="Deleting..." variant="danger">
                        Delete campaign
                      </SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="p-6">
              <Badge tone="accent">Winner Verification</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Review proofs and payout status</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.winners.map((winner) => (
                  <form
                    key={winner.id}
                    action={reviewWinnerAction}
                    className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                  >
                    <input type="hidden" name="winnerId" value={winner.id} />
                    <div className="split">
                      <div>
                        <p className="font-semibold">
                          {winner.userName} · {winner.drawLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {winner.matchCount}-match · ${winner.prizeAmount.toFixed(2)}
                        </p>
                      </div>
                      <div className="cluster">
                        <span className="pill">{winner.verificationStatus}</span>
                        <span className="pill">{winner.payoutStatus}</span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="field">
                        <label>Verification</label>
                        <select name="verificationStatus" defaultValue={winner.verificationStatus} className="select">
                          <option value="not_submitted">Not submitted</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Payout</label>
                        <select name="payoutStatus" defaultValue={winner.payoutStatus} className="select">
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Admin notes</label>
                      <textarea name="notes" defaultValue={winner.notes ?? ""} className="textarea" />
                    </div>
                    <SubmitButton pendingLabel="Saving...">Update winner</SubmitButton>
                  </form>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <Badge>Users & Scores</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Manage subscribers</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.users.map((user) => (
                  <form
                    key={user.id}
                    action={updateUserAction}
                    className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <div className="split">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                      <div className="cluster">
                        <span className="pill">{user.role}</span>
                        <span className="pill">{user.accountType}</span>
                        <span className="pill">{user.subscription.status}</span>
                        <span className="pill">{formatPercent(user.charityPercentage)}</span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="field">
                        <label>Name</label>
                        <input name="name" defaultValue={user.name} className="input" required />
                      </div>
                      <div className="field">
                        <label>Email</label>
                        <input name="email" type="email" defaultValue={user.email} className="input" required />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="field">
                        <label>Role</label>
                        <select name="role" defaultValue={user.role} className="select">
                          <option value="subscriber">subscriber</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Account type</label>
                        <select name="accountType" defaultValue={user.accountType} className="select">
                          <option value="individual">individual</option>
                          <option value="team">team</option>
                          <option value="corporate">corporate</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Country code</label>
                        <input name="countryCode" defaultValue={user.countryCode} className="input" required />
                      </div>
                      <div className="field">
                        <label>Selected charity</label>
                        <select name="selectedCharityId" defaultValue={user.selectedCharity?.id ?? ""} className="select">
                          <option value="">No charity selected</option>
                          {dashboard.charities.map((charity) => (
                            <option key={charity.id} value={charity.id}>
                              {charity.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="field">
                        <label>Organization name</label>
                        <input
                          name="organizationName"
                          defaultValue={user.organizationName ?? ""}
                          className="input"
                        />
                      </div>
                      <div className="field">
                        <label>Charity percentage</label>
                        <input
                          name="charityPercentage"
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.01"
                          defaultValue={user.charityPercentage}
                          className="input"
                        />
                      </div>
                      <div className="field">
                        <label>Subscription status</label>
                        <select name="subscriptionStatus" defaultValue={user.subscription.status} className="select">
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                          <option value="cancelled">cancelled</option>
                          <option value="lapsed">lapsed</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Plan</label>
                        <select name="subscriptionPlan" defaultValue={user.subscription.plan} className="select">
                          <option value="monthly">monthly</option>
                          <option value="yearly">yearly</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <SubmitButton pendingLabel="Updating..." variant="secondary">
                        Save member changes
                      </SubmitButton>
                    </div>
                  </form>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <Badge tone="secondary">Score Editing</Badge>
              <h2 className="mt-4 text-2xl font-semibold">Recent score records</h2>
              <div className="mt-5 grid gap-4">
                {dashboard.scores.slice(0, 8).map((score) => (
                  <form
                    key={score.id}
                    action={updateScoreAction}
                    className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]"
                  >
                    <input type="hidden" name="scoreId" value={score.id} />
                    <div>
                      <p className="font-medium">{score.userName}</p>
                      <p className="text-sm text-slate-400">
                        {format(new Date(score.playedAt), "dd MMM yyyy")}
                      </p>
                    </div>
                    <input
                      name="value"
                      type="number"
                      min="1"
                      max="45"
                      defaultValue={score.value}
                      className="input"
                    />
                    <input
                      name="playedAt"
                      type="date"
                      defaultValue={score.playedAt.slice(0, 10)}
                      className="input"
                    />
                    <SubmitButton pendingLabel="Saving..." variant="secondary">
                      Save
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
