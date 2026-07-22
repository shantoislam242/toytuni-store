"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkReviewEligibility, submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

type Eligibility = Awaited<ReturnType<typeof checkReviewEligibility>>;

/**
 * Per-user "write a review" entry point for the PDP. The page itself is
 * static, so eligibility (signed in? already reviewed? order delivered?) is
 * resolved client-side via a server action on mount — never read from the
 * page/server component.
 */
export function WriteReviewCta({ slug }: { slug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Eligibility | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    checkReviewEligibility(slug).then((r) => {
      if (!cancelled) setStatus(r);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const submit = () => {
    if (rating < 1) {
      toast.error("Please pick a star rating.");
      return;
    }
    if (!body.trim()) {
      toast.error("Please write your review.");
      return;
    }
    startTransition(async () => {
      const r = await submitReview(slug, { rating, title: title.trim() || undefined, body: body.trim() });
      if (r.ok) {
        toast.success("Thanks for your review!");
        setFormOpen(false);
        setRating(0);
        setTitle("");
        setBody("");
        setStatus({ signedIn: true, eligible: false, alreadyReviewed: true });
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  // While eligibility is loading, render nothing — avoids a flash of the
  // wrong state before the server action resolves.
  if (status === null) return null;

  if (!status.signedIn) {
    return (
      <p className="text-sm text-ink-muted">
        <Link
          href={`/signin?next=${encodeURIComponent(`/products/${slug}`)}`}
          className="font-semibold text-neem-deep underline-offset-2 hover:underline"
        >
          Sign in to review
        </Link>{" "}
        this product.
      </p>
    );
  }

  if (status.alreadyReviewed) {
    return <p className="text-sm text-ink-muted">You&apos;ve reviewed this product ✓</p>;
  }

  if (!status.eligible) {
    return (
      <p className="text-sm text-ink-muted">
        Reviews unlock after your order is delivered.
      </p>
    );
  }

  if (!formOpen) {
    return (
      <Button type="button" variant="outline" onClick={() => setFormOpen(true)}>
        Write a review
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-cream-200 bg-cream-50 p-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Your rating</p>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            const filled = value <= (hoverRating || rating);
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                className="p-0.5"
              >
                <Star
                  className={cn(
                    "size-6",
                    filled ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Title (optional)</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sum up your experience"
          className="h-10 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Your review</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What did you and your little one think?"
          className="w-full resize-none rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
        />
      </label>

      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Submitting…" : "Submit review"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setFormOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
