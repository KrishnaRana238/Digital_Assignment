import { notFound } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { submitDonationAction } from "@/actions/member";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicCharities } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CharityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const charities = await getPublicCharities();
  const charity = charities.find((item) => item.slug === slug);

  if (!charity) {
    notFound();
  }

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <img
              src={charity.imageUrl}
              alt={charity.name}
              className="h-[360px] w-full object-cover"
            />
            <div className="space-y-5 p-7">
              <div className="split">
                <div className="cluster">
                  <Badge tone={charity.featured ? "accent" : "secondary"}>
                    {charity.category}
                  </Badge>
                  <span className="pill">{charity.countryCode}</span>
                </div>
                <span className="pill">${(charity.raisedTotal ?? 0).toFixed(2)} raised</span>
              </div>
              <h1 className="section-title" style={{ fontFamily: "var(--font-display)" }}>
                {charity.name}
              </h1>
              <p className="section-copy">{charity.description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Upcoming event</p>
                  <p className="mt-2 text-lg font-semibold">{charity.upcomingEvent}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Platform supporters</p>
                  <p className="mt-2 text-lg font-semibold">{charity.subscriberCount ?? 0}</p>
                </div>
              </div>
              {charity.galleryImages.length ? (
                <div className="space-y-3">
                  <div className="split">
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Impact gallery</p>
                    <span className="pill">{charity.galleryImages.length} images</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {charity.galleryImages.map((imageUrl, index) => (
                      <img
                        key={`${charity.id}-gallery-${index}`}
                        src={imageUrl}
                        alt={`${charity.name} gallery ${index + 1}`}
                        className="h-40 w-full rounded-3xl object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <div className="split">
              <Badge tone="accent">Support This Charity</Badge>
              <HeartHandshake className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="mt-4 muted">
              Record an independent donation directly against this charity, even if you are not yet
              a platform member.
            </p>
            <form action={submitDonationAction} className="mt-6 grid gap-4">
              <input type="hidden" name="charityId" value={charity.id} />
              <div className="field">
                <label htmlFor="donorName">Your name</label>
                <input id="donorName" name="donorName" className="input" required />
              </div>
              <div className="field">
                <label htmlFor="donorEmail">Email</label>
                <input id="donorEmail" name="donorEmail" type="email" className="input" />
              </div>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input id="amount" name="amount" type="number" step="0.01" min="1" className="input" required />
              </div>
              <SubmitButton pendingLabel="Recording donation...">Donate now</SubmitButton>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
