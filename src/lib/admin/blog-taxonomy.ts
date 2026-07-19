export { isPermutation } from "@/lib/admin/taxonomy";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate a blog-category create/edit input (slug immutable on edit). Pure. */
export function validateBlogCategory(
  input: { slug?: string; name: string; sort: number },
  opts: { requireSlug: boolean },
): { ok: true } | { ok: false; error: string } {
  if (opts.requireSlug && (!input.slug || !SLUG_RE.test(input.slug))) {
    return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  }
  if (input.name.trim() === "") return { ok: false, error: "Name is required." };
  if (!Number.isInteger(input.sort) || input.sort < 0) return { ok: false, error: "Sort must be a non-negative whole number." };
  return { ok: true };
}
