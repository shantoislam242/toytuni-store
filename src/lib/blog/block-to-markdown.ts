import type { BlogBlock } from "@/lib/types";

/** Convert the legacy typed blocks to markdown (used by the seed to migrate the
 *  mock posts, and by the mock fail-soft path). Pure. */
export function blockToMarkdown(blocks: BlogBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "h2") return `## ${b.text}`;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
      return b.text;
    })
    .join("\n\n");
}
