"use client";

import { BadgeCheck, Star } from "lucide-react";
import { WriteReviewCta } from "@/components/product/write-review-cta";
import { formatDate } from "@/lib/format";
import { ratingDistribution } from "@/lib/reviews/validation";
import { cn } from "@/lib/utils";
import type { ProductReview } from "@/lib/data/reviews";

// Soft brand-tone backgrounds for the initial avatars. Picked deterministically
// from the reviewer's name so the same person always gets the same colour.
const avatarPalette = [
  "bg-neem/15 text-neem-deep",
  "bg-terracotta/20 text-terracotta",
  "bg-mustard/30 text-ink",
  "bg-dusty-blue/25 text-ink",
  "bg-blush/40 text-ink",
];

/** Circular avatar generated from the first letter of the reviewer's name. */
function InitialAvatar({ name }: { name: string }) {
  const trimmed = name.trim();
  const initial = (trimmed.charAt(0) || "?").toUpperCase();
  // Sum the char codes so the colour is stable per name (not just first letter).
  const hash = Array.from(trimmed).reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const tone = avatarPalette[hash % avatarPalette.length];

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 flex-none select-none items-center justify-center rounded-full font-display text-base font-bold",
        tone,
      )}
    >
      {initial}
    </span>
  );
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(rating) ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

/** A single review row. Every review here is purchase-verified by construction
 *  (see `getReviewEligibility` — only delivered-order customers can post), so
 *  the badge is unconditional. */
function ReviewCard({ review }: { review: ProductReview }) {
  return (
    <article className="border-b border-cream-200 py-5 last:border-0">
      <div className="flex gap-3">
        <InitialAvatar name={review.customerName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-ink">{review.customerName}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-neem-deep">
              <BadgeCheck className="size-3.5" />
              Verified purchase
            </span>
            <span className="text-xs text-ink-soft">
              {formatDate(review.createdAt.slice(0, 10))}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-3">
            <Stars rating={review.rating} />
            {review.title ? (
              <span className="font-display text-sm font-bold text-ink">
                {review.title}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{review.body}</p>
    </article>
  );
}

/** Rating breakdown — counts of 5★ down to 1★ as horizontal bars. */
function RatingBreakdown({ reviews }: { reviews: ProductReview[] }) {
  const dist = ratingDistribution(reviews.map((r) => r.rating)); // index 0 = 1★ … index 4 = 5★
  const buckets = [5, 4, 3, 2, 1];
  const total = reviews.length || 1;

  return (
    <div className="w-full space-y-2">
      {buckets.map((star) => {
        const count = dist[star - 1];
        const pct = (count / total) * 100;
        return (
          <div key={star} className="flex items-center gap-3 text-sm text-ink-muted">
            <span className="w-3 shrink-0 text-right font-medium tabular-nums">
              {star}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream-200">
              <div
                className="h-full rounded-full bg-neem transition-[width] duration-500 ease-out"
                // A tiny min keeps a rounded nub visible for small (non-zero) counts.
                style={{ width: count === 0 ? 0 : `max(0.75rem, ${pct}%)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Customer reviews: write-review CTA, overall rating card, rating breakdown
 * bars, and the real DB-backed review list with stars and verified badges.
 */
export function ProductReviews({
  slug,
  reviews,
  avgRating,
  reviewCount,
}: {
  slug: string;
  reviews: ProductReview[];
  avgRating: number;
  reviewCount: number;
}) {
  // Prefer the live average of the fetched reviews (matches what's on screen);
  // fall back to the product's stored aggregate when reviews are empty (e.g.
  // still warming the cache after a fresh migration).
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : avgRating;

  return (
    <section id="reviews" className="space-y-6">
      <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Customer Reviews
      </h2>

      <WriteReviewCta slug={slug} />

      {reviewCount > 0 ? (
        <div className="grid gap-6 rounded-xl border border-cream-200 bg-cream-50 p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
          <div className="flex flex-col items-center justify-center text-center sm:items-start sm:text-left">
            <span className="font-display text-5xl font-bold text-ink">{avg.toFixed(1)}</span>
            <Stars rating={avg} className="mt-2" />
            <span className="mt-2 text-sm text-ink-muted">
              Based on {reviewCount.toLocaleString("en-US")} reviews
            </span>
          </div>
          <div className="flex items-center sm:pl-8 sm:border-l sm:border-cream-200">
            <RatingBreakdown reviews={reviews} />
          </div>
        </div>
      ) : null}

      <div>
        {reviews.length ? (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        ) : (
          <p className="py-8 text-center text-sm text-ink-muted">
            No reviews yet — be the first!
          </p>
        )}
      </div>
    </section>
  );
}
