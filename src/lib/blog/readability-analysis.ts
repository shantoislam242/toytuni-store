import { scoreChecks, type AnalysisResult, type Check } from "@/lib/blog/analysis";

/** Strip markdown to rough plain text for readability heuristics. */
function toPlain(md: string): string {
  return md
    .replace(/`[^`]*`/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.replace(/\]\([^)]*\)/, "").replace(/^\[/, ""))
    .replace(/^#{1,6}\s+/gm, "").replace(/[*_>#-]/g, " ").replace(/\s+/g, " ").trim();
}
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s !== "");
}
function words(text: string): string[] {
  return text.match(/[A-Za-z']+/g) ?? [];
}
function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const g = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, g ? g.length : 1);
}
function fleschReadingEase(text: string): number {
  const sents = sentences(text); const ws = words(text);
  if (sents.length === 0 || ws.length === 0) return 0;
  const syl = ws.reduce((s, w) => s + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / sents.length) - 84.6 * (syl / ws.length);
}
const PASSIVE = /\b(?:was|were|is|are|been|being|be)\b\s+(?:\w+ly\s+)?\w+(?:ed|en|t)\b/i;
const TRANSITIONS = ["however","also","therefore","because","for example","in addition","meanwhile","finally","first","then","next","moreover","furthermore","so","but","although","while","since","as a result","in short"];

const good = (id: string, text: string): Check => ({ id, status: "good", text });
const ok = (id: string, text: string): Check => ({ id, status: "ok", text });
const bad = (id: string, text: string): Check => ({ id, status: "bad", text });

/** Readability analysis (Yoast-style, heuristic, English). Pure + total. */
export function analyzeReadability(bodyMarkdown: string): AnalysisResult {
  const text = toPlain(bodyMarkdown);
  const sents = sentences(text);
  const checks: Check[] = [];

  const flesch = fleschReadingEase(text);
  checks.push(flesch >= 60 ? good("flesch", `Flesch reading ease ${Math.round(flesch)} — easy to read.`)
    : flesch >= 30 ? ok("flesch", `Flesch reading ease ${Math.round(flesch)} (aim ≥ 60).`)
    : bad("flesch", `Flesch reading ease ${Math.round(flesch)} — hard to read.`));

  const longPct = sents.length ? (sents.filter((s) => words(s).length > 20).length / sents.length) * 100 : 0;
  checks.push(longPct < 25 ? good("long-sentences", `${Math.round(longPct)}% long sentences — good.`)
    : longPct < 40 ? ok("long-sentences", `${Math.round(longPct)}% of sentences are long (>20 words).`)
    : bad("long-sentences", `${Math.round(longPct)}% of sentences are long — shorten them.`));

  const passivePct = sents.length ? (sents.filter((s) => PASSIVE.test(s)).length / sents.length) * 100 : 0;
  checks.push(passivePct < 10 ? good("passive", `${Math.round(passivePct)}% passive voice — good.`)
    : passivePct < 20 ? ok("passive", `${Math.round(passivePct)}% passive voice (aim < 10%).`)
    : bad("passive", `${Math.round(passivePct)}% passive voice — use more active voice.`));

  const transPct = sents.length ? (sents.filter((s) => TRANSITIONS.some((t) => s.toLowerCase().includes(t))).length / sents.length) * 100 : 0;
  checks.push(transPct >= 30 ? good("transitions", `${Math.round(transPct)}% of sentences use transition words — good.`)
    : transPct >= 20 ? ok("transitions", `${Math.round(transPct)}% transition words (aim ≥ 30%).`)
    : bad("transitions", `${Math.round(transPct)}% transition words — add more to connect ideas.`));

  const paras = bodyMarkdown.split(/\n\s*\n/).map((p) => words(toPlain(p)).length);
  const longestPara = paras.length ? Math.max(...paras) : 0;
  checks.push(longestPara <= 150 ? good("paragraphs", "Paragraph lengths are good.")
    : ok("paragraphs", `A paragraph has ${longestPara} words — consider splitting (aim ≤ 150).`));

  return { ...scoreChecks(checks), checks };
}
