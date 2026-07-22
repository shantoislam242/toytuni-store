import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";

/** A single published (non-hidden) product review. RLS already excludes
 *  hidden reviews for the anon client — no `hidden` flag surfaces here.
 *  Customer email never appears in this public read type. */
export type ProductReview = {
  id: string;
  customerName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
};

/** A single answered (non-hidden) product question. RLS already restricts
 *  reads to `answer is not null and not hidden` — `answer` is non-null here. */
export type ProductQuestion = {
  id: string;
  customerName: string;
  question: string;
  answer: string;
  answeredAt: string | null;
  createdAt: string;
};

/** `product_reviews`/`product_questions` (migration 0014) predate the
 *  generated types in `database.types.ts` — same `as never` table-name
 *  escape hatch `blog.ts` uses for `blog_posts`/`blog_categories`. Row
 *  shapes are supplied via `.overrideTypes()`. */
type ReviewRow = {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
};

type QuestionRow = {
  id: string;
  customer_name: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

function rowToReview(r: ReviewRow): ProductReview {
  return { id: r.id, customerName: r.customer_name, rating: r.rating, title: r.title, body: r.body, createdAt: r.created_at };
}

function rowToQuestion(r: QuestionRow & { answer: string }): ProductQuestion {
  return { id: r.id, customerName: r.customer_name, question: r.question, answer: r.answer, answeredAt: r.answered_at, createdAt: r.created_at };
}

/** Resolve a product slug → uuid via the anon client (products are publicly
 *  readable). Returns null if the slug doesn't exist. */
async function resolveProductId(slug: string): Promise<string | null> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function readProductReviews(slug: string): Promise<ProductReview[]> {
  try {
    const productId = await resolveProductId(slug);
    if (!productId) return [];
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("product_reviews" as never)
      .select("id, customer_name, rating, title, body, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .overrideTypes<ReviewRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map(rowToReview);
  } catch (err) {
    console.error("getProductReviews failed:", err);
    return [];
  }
}

async function readProductQuestions(slug: string): Promise<ProductQuestion[]> {
  try {
    const productId = await resolveProductId(slug);
    if (!productId) return [];
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("product_questions" as never)
      .select("id, customer_name, question, answer, answered_at, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .overrideTypes<QuestionRow[], { merge: false }>();
    if (error) throw error;
    // Defensive: RLS already restricts reads to answered+visible rows, but
    // don't trust that alone to guarantee `answer` is non-null at the type level.
    return (data ?? [])
      .filter((q): q is QuestionRow & { answer: string } => q.answer !== null)
      .map(rowToQuestion);
  } catch (err) {
    console.error("getProductQuestions failed:", err);
    return [];
  }
}

export function getProductReviews(slug: string): Promise<ProductReview[]> {
  return unstable_cache(readProductReviews, ["product-reviews", slug], { tags: ["reviews"], revalidate: 3600 })(slug);
}

export function getProductQuestions(slug: string): Promise<ProductQuestion[]> {
  return unstable_cache(readProductQuestions, ["product-questions", slug], { tags: ["reviews"], revalidate: 3600 })(slug);
}
