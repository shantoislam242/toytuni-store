import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/section-heading";
import type { Product } from "@/lib/types";

type Props = {
  /** Omit when the rail sits under tabs that already name it. */
  title?: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
};

/**
 * Section heading + horizontally scrollable product carousel.
 * Mobile: swipe (peek of next card). Desktop: arrows.
 */
export function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel = "View all",
}: Props) {
  return (
    <section className="py-2">
      {title ? (
        <SectionHeading title={title} subtitle={subtitle} viewAllHref={viewAllHref} />
      ) : viewAllHref ? (
        <div className="mb-4 flex justify-end">
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-neem-deep underline-offset-4 hover:underline"
          >
            {viewAllLabel} →
          </Link>
        </div>
      ) : null}
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-3">
          {products.map((p) => (
            <CarouselItem
              key={p.slug}
              className="basis-[47%] pl-3 min-[420px]:basis-[44%] sm:basis-1/3 lg:basis-1/4"
            >
              <ProductCard product={p} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  );
}
