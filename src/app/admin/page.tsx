import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "Dashboard",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin dashboard placeholder. `admin/layout.tsx` has already re-checked the
 * session server-side and wrapped this in `<AdminShell>` — reaching this page
 * means the visitor is a verified admin. Real KPIs land in Task 4.
 */
export default function Page() {
  return (
    <div className="rounded-2xl border border-dashed border-cream-300 bg-cream-50/40 px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Dashboard
      </p>
      <h1 className="mt-2 font-display text-2xl font-bold text-ink">
        Coming next
      </h1>
      <p className="mt-2 text-ink-muted">
        KPIs and recent activity land here in the next slice.
      </p>
    </div>
  );
}
