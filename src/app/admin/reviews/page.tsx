import type { Metadata } from "next";
import { getAdminReviews, getAdminQuestions } from "@/lib/admin/queries";
import { ReviewsManager } from "@/components/admin/reviews-manager";

export function generateMetadata(): Metadata {
  return {
    title: "Reviews",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin moderation surface for product reviews + Q&A (Task 8). Both reads
 * are service-role (`getAdminReviews`/`getAdminQuestions`, Task 5) — unlike
 * the public reads, they include hidden rows and unanswered questions, which
 * RLS's "visible only" policies would otherwise exclude. The tab UI and
 * per-row moderation actions live in the client `ReviewsManager`.
 */
export default async function Page() {
  const [reviews, questions] = await Promise.all([getAdminReviews(), getAdminQuestions()]);

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Moderation
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Customer reviews and product questions.
        </p>
      </div>

      <div className="mt-6">
        <ReviewsManager reviews={reviews} questions={questions} />
      </div>
    </div>
  );
}
