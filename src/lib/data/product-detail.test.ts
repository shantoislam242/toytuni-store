import { describe, it, expect, vi } from "vitest";

// `product-detail.ts` is marked `server-only`, which throws on import outside
// a React Server Component. Stub it so the pure `rowToProductDetail` mapper
// can be unit-tested here without a Next.js server runtime (same pattern as
// `full-catalog.test.ts`).
vi.mock("server-only", () => ({}));

import { rowToProductDetail } from "./product-detail";
import type { Review } from "@/lib/types";

const reviews: Review[] = [{ id: "r", nameBn: "N", rating: 5, dateBn: "now", bodyBn: "b" }];
const dc = {
  features: ["f1", "f2"], benefits: ["b1"], whyPlay: ["w1"], howPlay: ["h1"],
  returnPolicy: "RP", specs: { materials: "wood" }, deliveryEstimate: "1-2 days",
  videoUrl: "https://youtu.be/x",
};

describe("rowToProductDetail", () => {
  it("maps detail_content + description + gallery + injected reviews", () => {
    const d = rowToProductDetail(
      { slug: "p", description: "DESC", detail_content: dc, gallery_urls: ["/a.jpg", "/b.jpg"], image_url: null },
      { reviews, fallbackImages: ["/mock.jpg"] },
    );
    expect(d.slug).toBe("p");
    expect(d.description).toBe("DESC");
    expect(d.features).toEqual(["f1", "f2"]);
    expect(d.specs).toEqual({ materials: "wood" });
    expect(d.imageSrcs).toEqual(["/a.jpg", "/b.jpg"]); // gallery_urls wins
    expect(d.reviews).toBe(reviews);
    expect(d.videoUrl).toBe("https://youtu.be/x");
    expect(typeof d.saleCountdown).toBe("string"); // default constant
  });

  it("falls back gallery: image_url when gallery_urls empty, then fallbackImages", () => {
    expect(
      rowToProductDetail({ slug: "p", description: "", detail_content: dc, gallery_urls: [], image_url: "/up.jpg" },
        { reviews: [], fallbackImages: ["/mock.jpg"] }).imageSrcs,
    ).toEqual(["/up.jpg"]);
    expect(
      rowToProductDetail({ slug: "p", description: "", detail_content: dc, gallery_urls: null, image_url: null },
        { reviews: [], fallbackImages: ["/mock.jpg"] }).imageSrcs,
    ).toEqual(["/mock.jpg"]);
  });
});
