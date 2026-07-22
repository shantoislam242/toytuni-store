"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { askQuestion } from "@/lib/reviews/actions";
import { formatDate } from "@/lib/format";
import type { ProductQuestion } from "@/lib/data/reviews";

// The exact copy `askQuestion` returns for a signed-out submit (see
// src/lib/reviews/actions.ts) — matched here to swap in a sign-in link
// instead of a plain error toast.
const SIGN_IN_ERROR = "Please sign in to ask a question.";

function QuestionCard({ question }: { question: ProductQuestion }) {
  return (
    <article className="border-b border-cream-200 py-5 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-ink">{question.customerName}</span>
        <span className="text-xs text-ink-soft">
          {formatDate(question.createdAt.slice(0, 10))}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-ink">{question.question}</p>

      <div className="mt-3 rounded-lg border border-neem/20 bg-neem/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neem-deep">
          Toytuni replied
        </p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{question.answer}</p>
      </div>
    </article>
  );
}

/**
 * Product Q&A: the published (answered) question list plus an "ask a
 * question" form. Like the reviews section, per-user state (signed in? who
 * asked?) is resolved client-side — the PDP itself stays static.
 */
export function ProductQa({ slug, questions }: { slug: string; questions: ProductQuestion[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!question.trim()) {
      toast.error("Please write your question.");
      return;
    }
    startTransition(async () => {
      const r = await askQuestion(slug, question.trim());
      if (r.ok) {
        toast.success("We'll publish it once answered.");
        setQuestion("");
        setFormOpen(false);
        setNeedsSignIn(false);
      } else if (r.error === SIGN_IN_ERROR) {
        setNeedsSignIn(true);
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          <MessageCircleQuestion className="size-6 text-neem-deep" />
          Questions &amp; Answers
        </h2>
        {!formOpen ? (
          <Button type="button" variant="outline" onClick={() => setFormOpen(true)}>
            Ask a question
          </Button>
        ) : null}
      </div>

      {formOpen ? (
        <div className="space-y-3 rounded-xl border border-cream-200 bg-cream-50 p-4">
          {needsSignIn ? (
            <p className="text-sm text-ink-muted">
              <Link
                href={`/signin?next=${encodeURIComponent(`/products/${slug}`)}`}
                className="font-semibold text-neem-deep underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              to ask a question.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Your question</span>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Ask about sizing, safety, care…"
                  className="w-full resize-none rounded-lg border border-cream-300 bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
                />
              </label>
              <div className="flex gap-2">
                <Button type="button" onClick={submit} disabled={pending}>
                  {pending ? "Sending…" : "Submit question"}
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
            </>
          )}
        </div>
      ) : null}

      <div>
        {questions.length ? (
          questions.map((q) => <QuestionCard key={q.id} question={q} />)
        ) : (
          <p className="py-8 text-center text-sm text-ink-muted">No questions yet.</p>
        )}
      </div>
    </section>
  );
}
