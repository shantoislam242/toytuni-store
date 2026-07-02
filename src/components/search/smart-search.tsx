"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Clock,
  CornerDownLeft,
  Loader2,
  Mic,
  Search,
  SearchX,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/product/product-image";
import { products } from "@/lib/mock/products";
import { categories } from "@/lib/mock/categories";
import {
  addRecentSearch,
  clearRecentSearches,
  readRecentSearches,
} from "@/lib/recent-searches";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

const POPULAR_SEARCHES = ["Rattle", "Teether", "Stacking", "Montessori", "Building blocks", "Puzzle"];
// Combined product + category suggestions are capped at this total. Products take
// priority; up to 2 slots are reserved for categories so both types stay visible
// when both match, and categories expand to fill spare slots when products are few.
const MAX_SUGGESTIONS = 6;
const RESERVED_CATEGORY_SLOTS = 2;
// Left-column word suggestions (query completions built from the catalogue).
const MAX_TERM_SUGGESTIONS = 6;

// --- Minimal Web Speech API typings (not in the standard DOM lib) ---
type SpeechAlternative = { transcript: string };
type SpeechResult = ArrayLike<SpeechAlternative>;
type SpeechResultList = ArrayLike<SpeechResult>;
type SpeechEventLike = { results: SpeechResultList };
type SpeechErrorLike = { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Wraps every case-insensitive match of `query` in `text` with a highlight. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-mustard/40 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {children}
      </span>
      {action}
    </div>
  );
}

/**
 * Premium intelligent search: live product + category suggestions, recent &
 * popular searches, voice input (Web Speech API), highlighted matches, a loading
 * state, an empty state, full keyboard navigation (↑ ↓ Enter Esc), a ⌘/Ctrl-K
 * focus shortcut, click-outside dismissal, and an animated dropdown. Frontend
 * only — searches the static mock catalogue; recent searches persist in
 * localStorage. Keeps the existing header search design language.
 */
export function SmartSearch({
  className,
  autoFocus = false,
}: {
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => setRecent(readRecentSearches()), []);
  useEffect(() => setVoiceSupported(Boolean(getSpeechCtor())), []);
  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => {
    if (autoFocus) {
      setOpen(true);
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Debounce the query and show the spinner while it settles.
  useEffect(() => {
    if (!query.trim()) {
      setDebounced("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      setDebounced(query);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const q = debounced.trim().toLowerCase();
  const isSearching = query.trim().length > 0;

  // All matches first, then trim to a combined cap of MAX_SUGGESTIONS.
  const matchedProducts = useMemo(
    () => (q ? products.filter((p) => p.titleBn.toLowerCase().includes(q)) : []),
    [q],
  );
  const matchedCategories = useMemo(
    () =>
      q
        ? categories.filter(
            (c) =>
              c.nameBn.toLowerCase().includes(q) ||
              (c.taglineBn?.toLowerCase().includes(q) ?? false),
          )
        : [],
    [q],
  );

  // Reserve a couple of slots for categories (when any match) so both types show;
  // products fill the rest, and categories expand into any slots products leave.
  const { productResults, categoryResults } = useMemo(() => {
    const reserved = Math.min(matchedCategories.length, RESERVED_CATEGORY_SLOTS);
    const prods = matchedProducts.slice(0, MAX_SUGGESTIONS - reserved);
    const cats = matchedCategories.slice(0, MAX_SUGGESTIONS - prods.length);
    return { productResults: prods, categoryResults: cats };
  }, [matchedProducts, matchedCategories]);

  // Left-column word suggestions: a de-duplicated pool of product titles,
  // category names and popular terms, filtered by the query. These are query
  // completions (clicking one refines the search — it does not navigate).
  const suggestionPool = useMemo(() => {
    const pool = new Set<string>();
    products.forEach((p) => pool.add(p.titleBn));
    categories.forEach((c) => pool.add(c.nameBn));
    POPULAR_SEARCHES.forEach((t) => pool.add(t));
    return [...pool];
  }, []);
  const termSuggestions = useMemo(
    () =>
      q
        ? suggestionPool
            .filter((t) => t.toLowerCase().includes(q))
            .slice(0, MAX_TERM_SUGGESTIONS)
        : [],
    [q, suggestionPool],
  );

  const hasResults =
    termSuggestions.length > 0 || productResults.length > 0 || categoryResults.length > 0;

  // Flat list of keyboard-navigable items (order must match render order).
  type NavItem =
    | { kind: "product"; product: Product }
    | { kind: "category"; category: Category }
    | { kind: "term"; term: string };

  const navItems: NavItem[] = useMemo(() => {
    if (isSearching) {
      return [
        // order must match render: left word suggestions, then products, then categories
        ...termSuggestions.map((term) => ({ kind: "term" as const, term })),
        ...productResults.map((product) => ({ kind: "product" as const, product })),
        ...categoryResults.map((category) => ({ kind: "category" as const, category })),
      ];
    }
    return [
      ...recent.map((term) => ({ kind: "term" as const, term })),
      ...POPULAR_SEARCHES.map((term) => ({ kind: "term" as const, term })),
    ];
  }, [isSearching, termSuggestions, productResults, categoryResults, recent]);

  useEffect(() => setActiveIndex(-1), [debounced, open]);

  const closeDropdown = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const saveIfSearching = () => {
    if (query.trim()) setRecent(addRecentSearch(query.trim()));
  };
  const goToProduct = (p: Product) => {
    saveIfSearching();
    setQuery(p.titleBn); // fill the input with the chosen suggestion
    closeDropdown();
    router.push(`/products/${p.slug}`);
  };
  const goToCategory = (c: Category) => {
    saveIfSearching();
    setQuery(c.nameBn); // fill the input with the chosen suggestion
    closeDropdown();
    router.push(c.href);
  };
  const applyTerm = (term: string) => {
    setRecent(addRecentSearch(term));
    setQuery(term);
    setOpen(true);
    inputRef.current?.focus();
  };
  // Same as applyTerm but without the ref refocus — the word-suggestion buttons
  // keep the input focused via onMouseDown preventDefault, so no refocus is
  // needed (and it keeps this ref-free for the render-safety lint rule).
  const selectTerm = (term: string) => {
    setRecent(addRecentSearch(term));
    setQuery(term);
    setOpen(true);
  };
  const activate = (item: NavItem) => {
    if (item.kind === "product") goToProduct(item.product);
    else if (item.kind === "category") goToCategory(item.category);
    else applyTerm(item.term);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && navItems[activeIndex]) {
      activate(navItems[activeIndex]);
    } else if (productResults[0]) {
      goToProduct(productResults[0]);
    } else if (query.trim()) {
      applyTerm(query.trim());
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => (navItems.length ? (i + 1) % navItems.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        navItems.length ? (i - 1 + navItems.length) % navItems.length : -1,
      );
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeDropdown();
        inputRef.current?.blur();
      }
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) closeDropdown();
  };

  const clearRecent = () => {
    clearRecentSearches();
    setRecent([]);
  };

  // Voice search via the Web Speech API. Surfaces why it failed (permissions,
  // insecure origin, unsupported) instead of silently doing nothing.
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      toast.error("Voice search isn't supported in this browser.");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      toast.error("Voice search needs a secure (https) or localhost connection.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          setQuery(transcript);
          setOpen(true);
        }
      };
      rec.onend = () => setListening(false);
      rec.onerror = (event) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          toast.error("Microphone access is blocked. Allow it in your browser settings.");
        } else if (event?.error === "no-speech") {
          toast.info("Didn't catch that — tap the mic and try again.");
        }
      };
      recognitionRef.current = rec;
      setListening(true);
      setOpen(true);
      rec.start();
    } catch {
      setListening(false);
      toast.error("Couldn't start voice search. Please try again.");
    }
  };

  // Keyboard shortcuts: ⌘/Ctrl + K, or "/" — focus the search from anywhere.
  useEffect(() => {
    const focusSearch = () => {
      // The desktop search collapses on scroll-down, so bring it back into view
      // first, then focus (preventScroll avoids a second jump).
      window.scrollTo({ top: 0, behavior: "smooth" });
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    };
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      } else if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeDropdown();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const optionCls = (index: number) =>
    cn(
      "transition-colors",
      activeIndex === index ? "bg-cream-100" : "hover:bg-cream-100",
    );
  const optionProps = (index: number) => ({
    id: `search-item-${index}`,
    role: "option" as const,
    "aria-selected": activeIndex === index,
    onMouseEnter: () => setActiveIndex(index),
  });

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className={cn("relative", className)}
      role="search"
    >
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search toys…"
          aria-label="Search"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
          autoComplete="off"
          className="h-9 bg-cream-50 pl-8 pr-16"
        />

        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {loading ? <Loader2 className="size-4 animate-spin text-ink-soft" /> : null}
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-100 hover:text-ink"
            >
              <X className="size-4" />
            </button>
          ) : null}
          {voiceSupported ? (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? "Stop voice search" : "Search by voice"}
              aria-pressed={listening}
              className={cn(
                "relative flex size-7 items-center justify-center rounded-full transition-colors",
                listening
                  ? "bg-danger/10 text-danger"
                  : "text-ink-soft hover:bg-cream-100 hover:text-neem-deep",
              )}
            >
              {listening ? (
                <span className="absolute inline-flex size-5 animate-ping rounded-full bg-danger/40" />
              ) : null}
              <Mic className="relative size-4" />
            </button>
          ) : null}
        </div>
      </form>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-3xl border border-cream-300 bg-paper shadow-xl shadow-ink/5"
          >
            <div
              id="search-listbox"
              role="listbox"
              aria-label="Search suggestions"
              className="max-h-[70vh] overflow-y-auto sm:max-h-96"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-ink-muted">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              ) : isSearching ? (
                hasResults ? (
                  <div className="grid sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                    {/* left column: word / query suggestions */}
                    <div className="border-b border-cream-200 sm:border-b-0 sm:border-r sm:border-cream-200">
                      <SectionLabel>Suggestions</SectionLabel>
                      {termSuggestions.length ? (
                        termSuggestions.map((term, i) => (
                          <button
                            key={term}
                            type="button"
                            {...optionProps(i)}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectTerm(term)}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
                              optionCls(i),
                            )}
                          >
                            <Search className="size-3.5 flex-none text-ink-soft" />
                            <span className="flex-1 truncate text-sm text-ink">
                              <Highlight text={term} query={debounced} />
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 pb-3 text-sm text-ink-soft">No suggestions</p>
                      )}
                    </div>

                    {/* right column: matching products + categories (with images) */}
                    <div>
                      {productResults.length ? (
                        <>
                          <SectionLabel>Products</SectionLabel>
                          {productResults.map((p, i) => {
                            const index = termSuggestions.length + i;
                            return (
                              <Link
                                key={p.slug}
                                href={`/products/${p.slug}`}
                                {...optionProps(index)}
                                onClick={() => {
                                  saveIfSearching();
                                  setQuery(p.titleBn);
                                  closeDropdown();
                                }}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5",
                                  optionCls(index),
                                )}
                              >
                                <div className="relative size-12 flex-none overflow-hidden rounded-xl bg-cream-100">
                                  <ProductImage
                                    slug={p.slug}
                                    imageNum={1}
                                    label={p.imageLabelBn}
                                    fallbackTone={p.imageTones[0]}
                                    className="size-full p-1"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink">
                                    <Highlight text={p.titleBn} query={debounced} />
                                  </p>
                                  <p className="mt-0.5 text-sm text-ink-soft">
                                    {formatTk(p.price)}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </>
                      ) : null}

                      {categoryResults.length ? (
                        <>
                          <SectionLabel>Categories</SectionLabel>
                          {categoryResults.map((c, i) => {
                            const index = termSuggestions.length + productResults.length + i;
                            return (
                              <Link
                                key={c.slug}
                                href={c.href}
                                {...optionProps(index)}
                                onClick={() => {
                                  saveIfSearching();
                                  setQuery(c.nameBn);
                                  closeDropdown();
                                }}
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2.5",
                                  optionCls(index),
                                )}
                              >
                                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-neem/10 text-neem-deep">
                                  <Tag className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-ink">
                                    <Highlight text={c.nameBn} query={debounced} />
                                  </p>
                                  <p className="truncate text-xs text-ink-soft">
                                    Browse collection
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </>
                      ) : null}

                      {!productResults.length && !categoryResults.length ? (
                        <div className="flex h-full flex-col items-center justify-center px-3 py-8 text-center">
                          <p className="text-sm text-ink-muted">No matching products.</p>
                          <p className="mt-1 text-xs text-ink-soft">
                            Pick a suggestion on the left.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-cream-100 text-ink-soft">
                      <SearchX className="size-6" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      No results for “{query.trim()}”
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Try a different term or browse popular searches.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {POPULAR_SEARCHES.slice(0, 4).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => applyTerm(t)}
                          className="rounded-full border border-cream-300 px-3 py-1 text-xs text-ink transition-colors hover:border-neem-soft hover:text-neem-deep"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <>
                  {recent.length ? (
                    <>
                      <SectionLabel
                        action={
                          <button
                            type="button"
                            onClick={clearRecent}
                            className="text-[11px] font-medium text-ink-soft transition-colors hover:text-ink"
                          >
                            Clear
                          </button>
                        }
                      >
                        Recent
                      </SectionLabel>
                      {recent.map((t, i) => (
                        <button
                          key={t}
                          type="button"
                          {...optionProps(i)}
                          onClick={() => applyTerm(t)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                            optionCls(i),
                          )}
                        >
                          <Clock className="size-4 flex-none text-ink-soft" />
                          <span className="flex-1 truncate text-sm text-ink">{t}</span>
                        </button>
                      ))}
                    </>
                  ) : null}

                  <SectionLabel>
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="size-3.5" />
                      Popular searches
                    </span>
                  </SectionLabel>
                  <div className="flex flex-wrap gap-2 px-3 pb-3 pt-1">
                    {POPULAR_SEARCHES.map((t, i) => {
                      const index = recent.length + i;
                      return (
                        <button
                          key={t}
                          type="button"
                          {...optionProps(index)}
                          onClick={() => applyTerm(t)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-colors",
                            activeIndex === index
                              ? "border-neem bg-neem/10 text-neem-deep"
                              : "border-cream-300 text-ink hover:border-neem-soft",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-cream-200 px-3 py-2 text-[11px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="size-3" /> select
                <span className="mx-1">·</span>↑↓ navigate
                <span className="mx-1">·</span>Esc close
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                <span className="rounded border border-cream-300 px-1.5 py-0.5 font-mono">/</span>
                <span className="rounded border border-cream-300 px-1.5 py-0.5 font-mono">Ctrl K</span>
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
