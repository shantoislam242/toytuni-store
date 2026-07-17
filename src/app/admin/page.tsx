import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";

export function generateMetadata(): Metadata {
  return {
    title: "Admin",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin placeholder. The proxy (Task 3) gates `/admin` — reaching this page
 * means the visitor is an allow-listed admin, so this both proves the gate and
 * holds the route until the real dashboard lands in Phase 3.
 */
export default async function Page() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 items-center justify-center bg-paper px-4 py-24">
      <div className="w-full max-w-md rounded-3xl border border-cream-200 bg-cream-50/40 px-6 py-12 text-center shadow-sm sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Admin
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          Coming in Phase 3
        </h1>
        <p className="mt-3 text-ink-muted">
          The admin dashboard isn&apos;t built yet.
        </p>
        {user?.email ? (
          <p className="mt-6 break-all text-sm text-ink-soft">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
