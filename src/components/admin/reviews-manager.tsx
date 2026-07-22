"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import {
  setReviewHidden,
  deleteReview,
  answerQuestion,
  setQuestionHidden,
  deleteQuestion,
} from "@/lib/admin/actions";
import type { AdminReview, AdminQuestion } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-3.5", i < rating ? "fill-mustard text-mustard" : "text-cream-300")} />
      ))}
    </span>
  );
}

function HiddenBadge({ hidden }: { hidden: boolean }) {
  if (!hidden) return <span className="text-ink-soft">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
      Hidden
    </span>
  );
}

/**
 * Admin moderation for reviews + Q&A (Task 8). Two tabs backed by the
 * service-role reads from the parent server page (`getAdminReviews()` /
 * `getAdminQuestions()`, Task 5) — both already include hidden/unanswered
 * rows that the public RLS-scoped reads exclude. Every mutation is one of
 * the Task 5 Server Actions (`setReviewHidden`/`deleteReview`/
 * `answerQuestion`/`setQuestionHidden`/`deleteQuestion`); each follows the
 * same idiom as `TaxonomyManager`/`BlogPostsTable`: `useTransition`, check
 * `r.ok`, toast, then `router.refresh()` to re-pull the server data.
 */
export function ReviewsManager({ reviews, questions }: { reviews: AdminReview[]; questions: AdminQuestion[] }) {
  const router = useRouter();
  const unansweredCount = useMemo(() => questions.filter((q) => q.answer === null).length, [questions]);
  const refresh = () => router.refresh();

  return (
    <Tabs defaultValue="reviews">
      <TabsList>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="questions" className="gap-1.5">
          Questions
          {unansweredCount > 0 && (
            <Badge variant="secondary" className="h-4.5 min-w-4.5 px-1.5 text-[10px]">
              {unansweredCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="reviews" className="mt-4">
        <ReviewsTable reviews={reviews} onRefresh={refresh} />
      </TabsContent>
      <TabsContent value="questions" className="mt-4">
        <QuestionsList questions={questions} onRefresh={refresh} />
      </TabsContent>
    </Tabs>
  );
}

function ReviewsTable({ reviews, onRefresh }: { reviews: AdminReview[]; onRefresh: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggleHidden = (review: AdminReview) => {
    setBusyId(review.id);
    startTransition(async () => {
      const r = await setReviewHidden(review.id, !review.hidden);
      setBusyId(null);
      if (r.ok) {
        toast.success(review.hidden ? "Review unhidden." : "Review hidden.");
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const remove = (review: AdminReview) => {
    if (!confirm(`Delete this review by ${review.customerName}? This can't be undone.`)) return;
    setBusyId(review.id);
    startTransition(async () => {
      const r = await deleteReview(review.id);
      setBusyId(null);
      if (r.ok) {
        toast.success("Review deleted.");
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-cream-300">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Product</th>
            <th className="px-4 py-2.5 font-medium">Rating</th>
            <th className="px-4 py-2.5 font-medium">Review</th>
            <th className="px-4 py-2.5 font-medium">Customer</th>
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => {
            const busy = isPending && busyId === review.id;
            return (
              <tr key={review.id} className="border-b border-cream-200 align-top last:border-b-0 hover:bg-cream-50">
                <td className="px-4 py-3 font-medium text-ink">{review.productTitle}</td>
                <td className="px-4 py-3">
                  <RatingStars rating={review.rating} />
                </td>
                <td className="max-w-72 px-4 py-3">
                  {review.title && <div className="font-medium text-ink">{review.title}</div>}
                  <div className="line-clamp-2 text-ink-muted">{review.body}</div>
                </td>
                <td className="px-4 py-3 text-ink-muted" title={review.customerEmail}>
                  {review.customerName}
                </td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(review.createdAt.slice(0, 10))}</td>
                <td className="px-4 py-3">
                  <HiddenBadge hidden={review.hidden} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => toggleHidden(review)}>
                      {review.hidden ? "Unhide" : "Hide"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Delete review"
                      disabled={busy}
                      className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => remove(review)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuestionsList({ questions, onRefresh }: { questions: AdminQuestion[]; onRefresh: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const publish = (question: AdminQuestion) => {
    const answer = (drafts[question.id] ?? "").trim();
    if (!answer) return;
    setBusyId(question.id);
    startTransition(async () => {
      const r = await answerQuestion(question.id, answer);
      setBusyId(null);
      if (r.ok) {
        toast.success("Answer published.");
        setDrafts((d) => {
          const next = { ...d };
          delete next[question.id];
          return next;
        });
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const toggleHidden = (question: AdminQuestion) => {
    setBusyId(question.id);
    startTransition(async () => {
      const r = await setQuestionHidden(question.id, !question.hidden);
      setBusyId(null);
      if (r.ok) {
        toast.success(question.hidden ? "Question unhidden." : "Question hidden.");
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const remove = (question: AdminQuestion) => {
    if (!confirm(`Delete this question from ${question.customerName}? This can't be undone.`)) return;
    setBusyId(question.id);
    startTransition(async () => {
      const r = await deleteQuestion(question.id);
      setBusyId(null);
      if (r.ok) {
        toast.success("Question deleted.");
        onRefresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cream-300 px-6 py-14 text-center text-ink-muted">
        No questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question) => {
        const busy = isPending && busyId === question.id;
        const answered = question.answer !== null;
        return (
          <div key={question.id} className="rounded-xl border border-cream-300 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-neem-deep">
                  {question.productTitle}
                </div>
                <p className="mt-1 font-medium text-ink">{question.question}</p>
                <p className="mt-1 text-xs text-ink-soft" title={question.customerEmail}>
                  {question.customerName} · {formatDate(question.createdAt.slice(0, 10))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!answered && (
                  <span className="inline-flex items-center rounded-full bg-mustard/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mustard">
                    Unanswered
                  </span>
                )}
                {question.hidden && (
                  <span className="inline-flex items-center rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
                    Hidden
                  </span>
                )}
              </div>
            </div>

            {answered ? (
              <div className="mt-3 rounded-lg bg-cream-100 p-3">
                <p className="text-sm text-ink">{question.answer}</p>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => toggleHidden(question)}>
                    {question.hidden ? "Unhide" : "Hide"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete question"
                    disabled={busy}
                    className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => remove(question)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={drafts[question.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [question.id]: e.target.value }))}
                  placeholder="Write an answer…"
                  rows={2}
                  disabled={busy}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    disabled={busy || !(drafts[question.id] ?? "").trim()}
                    onClick={() => publish(question)}
                  >
                    Publish answer
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
