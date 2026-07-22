export type ReviewInput = { rating: number; title?: string; body: string };
type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

export function validateReviewInput(
  input: ReviewInput,
): Ok<{ rating: number; title: string | null; body: string }> | Err {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Rating must be 1–5 stars." };
  }
  const body = input.body.trim();
  if (body === "") return { ok: false, error: "Please write your review." };
  if (body.length > 2000) return { ok: false, error: "Review is too long (max 2000)." };
  const title = (input.title ?? "").trim();
  if (title.length > 120) return { ok: false, error: "Title is too long (max 120)." };
  return { ok: true, value: { rating: input.rating, title: title === "" ? null : title, body } };
}

export function validateQuestion(text: string): Ok<string> | Err {
  const q = text.trim();
  if (q === "") return { ok: false, error: "Please write your question." };
  if (q.length > 1000) return { ok: false, error: "Question is too long (max 1000)." };
  return { ok: true, value: q };
}

/** Counts per star, index 0 = 1★ … index 4 = 5★. Out-of-band values ignored. */
export function ratingDistribution(ratings: number[]): [number, number, number, number, number] {
  const out: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const r of ratings) if (Number.isInteger(r) && r >= 1 && r <= 5) out[r - 1]++;
  return out;
}
