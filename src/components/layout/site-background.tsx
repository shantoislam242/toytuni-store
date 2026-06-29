/**
 * Global site background — mirrors the Sign In page's clean "paper" surface and
 * applies it across the whole site. A single fixed, full-viewport layer sitting
 * behind all content (-z-10), so the background stays consistent across every
 * page and scroll position.
 *
 * Reusable + single source of truth: evolve the global background here (e.g.
 * add a subtle gradient/texture) and it updates everywhere at once.
 */
export function SiteBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-paper"
    />
  );
}
