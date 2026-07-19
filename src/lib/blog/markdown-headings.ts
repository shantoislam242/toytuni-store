/** Extract level-2 (`## `) heading texts from markdown, in order — for the
 *  post's table of contents. Pure. */
export function markdownHeadings(md: string): string[] {
  return md
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim())
    .filter((t) => t !== "");
}
