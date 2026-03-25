import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-[rgba(4,11,20,0.8)]">
      <div className="page-shell flex flex-col gap-4 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-slate-200">Good Lie Club</p>
          <p>Subscription-led golf scores, prize draws, and charity funding.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link href="/charities">Charities</Link>
          <Link href="/draws">Draws</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/login">Member Login</Link>
        </div>
      </div>
    </footer>
  );
}
