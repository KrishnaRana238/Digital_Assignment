import Link from "next/link";
import { signupAction } from "@/actions/auth";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicCharities } from "@/lib/api";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const charities = await getPublicCharities();

  return (
    <main className="shell-pad">
      <div className="page-shell grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="p-7">
          <Badge>Create Account</Badge>
          <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Join the club and choose who benefits from your subscription.
          </h1>
          <p className="mt-4 muted">
            New accounts start in a safe pre-billing state. After signup, members land in their
            dashboard and can activate monthly or yearly billing securely.
          </p>
        </Card>

        <Card className="p-7">
          <form action={signupAction} className="grid gap-4">
            {error ? (
              <div className="rounded-2xl border border-[rgba(255,125,107,0.3)] bg-[rgba(255,125,107,0.08)] p-4 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input id="name" name="name" className="input" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" className="input" required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input" required />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="field">
                <label htmlFor="accountType">Account type</label>
                <select id="accountType" name="accountType" className="select" defaultValue="individual">
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="countryCode">Country code</label>
                <input id="countryCode" name="countryCode" defaultValue="GB" className="input" required />
              </div>
              <div className="field">
                <label htmlFor="organizationName">Organization</label>
                <input id="organizationName" name="organizationName" className="input" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label htmlFor="plan">Plan</label>
                <select id="plan" name="plan" className="select" defaultValue="monthly">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="charityPercentage">Charity percentage</label>
                <input
                  id="charityPercentage"
                  name="charityPercentage"
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.01"
                  defaultValue="0.1"
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="charityId">Choose your charity</label>
              <select id="charityId" name="charityId" className="select">
                {charities.map((charity) => (
                  <option key={charity.id} value={charity.id}>
                    {charity.name}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton pendingLabel="Creating account...">Create account</SubmitButton>
          </form>
          <p className="mt-6 text-sm text-slate-400">
            Already subscribed?{" "}
            <Link href="/login" className="text-[var(--primary)]">
              Sign in instead
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
