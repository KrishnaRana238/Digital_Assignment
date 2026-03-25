import { BrainCircuit, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicDraws } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DrawsPage() {
  const draws = await getPublicDraws();

  return (
    <main className="shell-pad">
      <div className="page-shell space-y-8">
        <section className="space-y-4">
          <Badge>Draw Engine</Badge>
          <h1 className="section-title" style={{ fontFamily: "var(--font-display)" }}>
            Monthly prize draws with simulation first, then official publish.
          </h1>
          <p className="section-copy">
            The backend supports standard random generation and an algorithmic mode weighted by the
            score frequencies sitting inside the active subscriber pool.
          </p>
        </section>

        <section className="grid-auto">
          <Card className="p-6">
            <Shuffle className="h-6 w-6 text-[var(--secondary)]" />
            <h2 className="mt-4 text-2xl font-semibold">Random mode</h2>
            <p className="mt-2 muted">
              Standard lottery-style draw generation using five numbers in the Stableford range.
            </p>
          </Card>
          <Card className="p-6">
            <BrainCircuit className="h-6 w-6 text-[var(--primary)]" />
            <h2 className="mt-4 text-2xl font-semibold">Algorithmic mode</h2>
            <p className="mt-2 muted">
              Weighted by both common and underrepresented score frequencies so admins can explore
              different reward behaviours before publishing.
            </p>
          </Card>
        </section>

        <section className="grid gap-4">
          {draws.map((draw) => (
            <Card key={draw.id} className="p-6">
              <div className="split">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{draw.monthLabel}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{draw.status}</h2>
                </div>
                <div className="cluster">
                  <Badge tone="secondary">{draw.mode}</Badge>
                  <span className="pill">${draw.carryOver.toFixed(2)} carryover</span>
                  <span className="pill">{draw.winnerCount ?? 0} winners</span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Prize pool</p>
                  <p className="mt-2 text-3xl font-semibold">${draw.prizePoolTotal.toFixed(2)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Published numbers</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {(draw.numbers ?? []).length ? (
                      draw.numbers?.map((number, index) => (
                        <span
                          key={`${draw.id}-${number}-${index}`}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-semibold text-[var(--primary-ink)]"
                        >
                          {number}
                        </span>
                      ))
                    ) : (
                      <p className="muted">Numbers remain hidden until the draw is officially published.</p>
                    )}
                  </div>
                </div>
              </div>
              {draw.preview ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">3-match preview</p>
                    <p className="mt-2 text-2xl font-semibold">{draw.preview.three}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">4-match preview</p>
                    <p className="mt-2 text-2xl font-semibold">{draw.preview.four}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">5-match preview</p>
                    <p className="mt-2 text-2xl font-semibold">{draw.preview.five}</p>
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
