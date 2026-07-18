import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { Reveal } from "@/components/policy/reveal";
import { getCatalogProduct } from "@/lib/data/catalog";
import { productDetailBySlug } from "@/lib/mock/products";

const FEATURED_SLUG = "traditional-push-wagon";

/**
 * Home-page featured-product spotlight — a split band (product image on one
 * side, copy + CTA on the other) whose CTA links straight to the product page.
 * All data is read from the catalogue so title, price and image stay in sync.
 * Renders nothing if the featured product ever goes missing.
 */
export async function FeaturedProductHero() {
  const product = await getCatalogProduct(FEATURED_SLUG);
  if (!product) return null;

  const detail = productDetailBySlug(FEATURED_SLUG);
  const href = `/products/${product.slug}`;
  const highlights = (detail?.benefits ?? []).slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-[90rem] lg:px-8">
      <Reveal>
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-cream-200 bg-gradient-to-br from-cream-100 to-cream-50 p-6 shadow-sm sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-12">
          {/* image (clickable) */}
          <Link
            href={href}
            aria-label={product.titleBn}
            className="group relative block aspect-square overflow-hidden rounded-2xl bg-frame shadow-frame"
          >
            {product.badge ? (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-neem px-3 py-1 text-xs font-bold text-paper shadow-sm">
                {product.badge}
              </span>
            ) : null}
            <ProductImage
              slug={product.slug}
              imageNum={1}
              label={product.imageLabelBn}
              fallbackTone={product.imageTones[0]}
              imageUrl={product.imageUrl}
              className="size-full transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </Link>

          {/* copy */}
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neem-deep">
              New Arrival
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {product.titleBn}
            </h2>

            {detail?.description ? (
              <p className="mt-3 max-w-lg text-[15px] leading-7 text-ink-muted">
                {detail.description}
              </p>
            ) : null}

            {highlights.length ? (
              <ul className="mt-5 space-y-2">
                {highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2.5 text-sm font-medium text-ink"
                  >
                    <span className="flex size-5 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                      <Check className="size-3.5" />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* CTA → product page */}
            <div className="mt-7">
              <Link
                href={href}
                className="group relative inline-flex h-[3.25rem] items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-b from-neem to-neem-deep px-6 text-xs font-bold tracking-wide text-paper shadow-lg shadow-neem/30 ring-1 ring-inset ring-paper/15 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-neem/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem sm:px-8 sm:text-sm"
              >
                {/* diagonal shine sweep on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-paper/35 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[130%] group-hover:opacity-100"
                />
                <span className="relative z-10">Discover the Push Wagon</span>
                <ArrowRight className="relative z-10 size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
