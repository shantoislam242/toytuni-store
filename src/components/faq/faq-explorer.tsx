"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { FAQ_CATEGORIES, type FaqItem } from "@/lib/faq/faqs-shape";

/**
 * Interactive FAQ explorer: a live search box, category filter chips, and a
 * single-open accordion of matching questions. Client component — owns the
 * search and filter state. Filtering combines the active category with the
 * search query (matched against question and answer text). The `faqs` come
 * from the admin-editable DB (`getFaqs`), passed down by the page.
 */
export function FaqExplorer({ faqs }: { faqs: FaqItem[] }) {
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  // Only show filter chips for categories that actually have questions.
  const faqFilters = useMemo(
    () => ["All", ...FAQ_CATEGORIES.filter((c) => faqs.some((f) => f.category === c))],
    [faqs],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      if (filter !== "All" && f.category !== filter) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    });
  }, [filter, query, faqs]);

  return (
    <div>
      {/* search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your question..."
          aria-label="Search frequently asked questions"
          className="h-14 w-full rounded-full border border-cream-300 bg-paper pl-12 pr-12 text-[15px] text-ink shadow-sm outline-none transition-colors placeholder:text-ink-soft focus:border-neem"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      {/* category chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {faqFilters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem",
              filter === f
                ? "border-neem bg-neem text-paper"
                : "border-cream-300 bg-paper text-ink hover:border-neem hover:text-neem-deep",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* results */}
      <div className="mt-8">
        {results.length > 0 ? (
          <AccordionPrimitive.Root type="single" collapsible className="flex flex-col gap-3">
            {results.map((f) => (
              <AccordionPrimitive.Item
                key={f.id}
                value={f.id}
                className="overflow-hidden rounded-2xl border border-cream-200 bg-paper shadow-sm transition-shadow duration-300 hover:shadow-md"
              >
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group/faq flex w-full items-center justify-between gap-4 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-neem/40">
                    <span className="min-w-0 break-words text-[15px] font-semibold text-ink sm:text-base">
                      {f.question}
                    </span>
                    <ChevronDown
                      className="size-5 shrink-0 text-neem transition-transform duration-300 group-aria-expanded/faq:rotate-180"
                      aria-hidden
                    />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up">
                  <div className="px-5 pb-5 text-[15px] leading-relaxed text-ink-muted">
                    <p>{f.answer}</p>
                    {f.link ? (
                      <Link
                        href={f.link.href}
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-neem-deep underline underline-offset-4 hover:text-neem"
                      >
                        {f.link.label} →
                      </Link>
                    ) : null}
                  </div>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        ) : (
          <div className="rounded-2xl border border-dashed border-cream-300 px-6 py-16 text-center">
            <p className="font-display text-lg font-bold text-ink">No matching questions</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              Try a different search term or category — or reach out and we&apos;ll help
              you directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
