import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="shell-pad">
      <div className="page-shell grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-7">
          <Badge>Member Login</Badge>
          <h1 className="mt-4 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Sign in to your player or admin workspace
          </h1>
          <p className="mt-4 muted">
            Demo credentials are seeded in the backend so you can test both roles immediately.
          </p>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm">
            <p className="font-medium text-white">Subscriber</p>
            <p className="mt-2 text-slate-300">alex@goodlie.club / Player123!</p>
            <p className="mt-4 font-medium text-white">Admin</p>
            <p className="mt-2 text-slate-300">admin@goodlie.club / Admin123!</p>
          </div>
        </Card>

        <Card className="p-7">
          <form action={loginAction} className="grid gap-4">
            {error ? (
              <div className="rounded-2xl border border-[rgba(255,125,107,0.3)] bg-[rgba(255,125,107,0.08)] p-4 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input" required />
            </div>
            <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Need a member account?{" "}
            <Link href="/signup" className="text-[var(--primary)]">
              Create one here
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
