import { HeartHandshake } from "lucide-react";
import { submitDonationAction } from "@/actions/member";
import { CharityDirectory } from "@/components/charities/charity-directory";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicCharities } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CharitiesPage() {
  const charities = await getPublicCharities();

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        <section className="space-y-4">
          <Badge>Charity Directory</Badge>
          <h1 className="section-title" style={{ fontFamily: "var(--font-display)" }}>
            Members subscribe for competition, but the platform is built to keep the impact visible.
          </h1>
          <p className="section-copy">
            Every subscriber selects a charity at signup, and independent donations can be made at
            any time without joining the draw.
          </p>
        </section>

        <section>
          <CharityDirectory charities={charities} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="split">
              <Badge tone="accent">Independent Donation</Badge>
              <HeartHandshake className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Support a cause without joining the draw</h2>
            <p className="mt-3 muted">
              This records an independent donation inside the platform backend so the admin team can
              track contribution totals alongside subscriber-funded giving.
            </p>
          </Card>

          <Card className="p-6">
            <form action={submitDonationAction} className="grid gap-4">
              <div className="field">
                <label htmlFor="donorName">Your name</label>
                <input id="donorName" name="donorName" className="input" required />
              </div>
              <div className="field">
                <label htmlFor="donorEmail">Email</label>
                <input id="donorEmail" name="donorEmail" type="email" className="input" />
              </div>
              <div className="field">
                <label htmlFor="charityId">Charity</label>
                <select id="charityId" name="charityId" className="select" required>
                  {charities.map((charity) => (
                    <option key={charity.id} value={charity.id}>
                      {charity.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input id="amount" name="amount" type="number" step="0.01" min="1" className="input" required />
              </div>
              <SubmitButton pendingLabel="Recording donation...">Record donation</SubmitButton>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}
