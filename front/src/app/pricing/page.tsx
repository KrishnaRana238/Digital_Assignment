import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { getPublicOverview } from "@/lib/api";
import { getSessionProfile } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const overview = await getPublicOverview();
  const profile = await getSessionProfile();

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        <section className="pricing-stage rounded-[2rem] border border-[rgba(255,70,85,0.14)] p-7 md:p-9">
          <div className="space-y-4">
            <Badge>Pricing</Badge>
            <h1 className="section-title" style={{ fontFamily: "var(--font-display)" }}>
              Subscription plans with a darker look and a clearer path into the platform.
            </h1>
            <p className="section-copy">
              A fixed share of every active subscription feeds the prize pool, while your selected
              charity gets at least {Math.round(overview.pricing.charityMinimumPercent * 100)}%.
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {[
            {
              title: "Monthly",
              price: overview.pricing.monthly,
              plan: "monthly",
              blurb: "Flexible entry with recurring access to score tracking and every monthly draw.",
            },
            {
              title: "Yearly",
              price: overview.pricing.yearly,
              plan: "yearly",
              blurb: "Discounted annual access for members who want fewer interruptions and stronger retained value.",
            },
          ].map((plan) => (
            <Card key={plan.title} className="pricing-plan p-7">
              <Badge tone={plan.plan === "yearly" ? "accent" : "secondary"}>{plan.title} plan</Badge>
              <h2 className="mt-5 text-4xl font-semibold">${plan.price}</h2>
              <p className="mt-3 muted">{plan.blurb}</p>
              <div className="mt-6 grid gap-3 red-divider pt-6">
                {[
                  "Subscriber dashboard and profile controls",
                  "Rolling last-five-score entry logic",
                  "Monthly draw participation and winnings view",
                  "Charity selection with editable contribution percentage",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 text-[var(--primary)]" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href={profile ? "/dashboard" : "/signup"}
                  className={buttonStyles({ className: "w-full" })}
                >
                  {profile ? "Manage in dashboard" : "Choose this plan"}
                </Link>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
