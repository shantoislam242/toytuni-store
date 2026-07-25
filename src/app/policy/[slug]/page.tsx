import type { Metadata } from "next";
import { PolicyPageView } from "@/components/policy/policy-page-view";
import { SafetyStandardsView } from "@/components/policy/safety-standards-view";
import { ShippingPolicyView } from "@/components/policy/shipping-policy-view";
import { SustainabilityView } from "@/components/policy/sustainability-view";
import { StubPage } from "@/components/stub-page";
import { getPolicyContent } from "@/lib/data/policy-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // `refund` is an alias for the Returns page — canonicalize it there.
  const alternates = { canonical: `/policy/${slug === "refund" ? "returns" : slug}` };
  if (slug === "shipping") {
    return {
      title: "Shipping & Delivery",
      alternates,
      description:
        "How and how quickly your handmade wooden toys are shipped and delivered — dispatch times, tracking, international orders, and Cash on Delivery.",
    };
  }
  if (slug === "safety-standards") {
    return {
      title: "Safety Standards",
      alternates,
      description:
        "How we keep play safe — non-toxic materials, hand-finished edges, our quality-control process, and the child-safe wood and finishes behind every toy.",
    };
  }
  if (slug === "sustainability") {
    return {
      title: "Sustainability",
      alternates,
      description:
        "Our commitment to the planet — renewable neem wood, plastic-free packaging, low-waste craftsmanship, and toys made to last generations then return to the earth.",
    };
  }
  const policy = await getPolicyContent(slug);
  if (policy) {
    return { title: policy.title, alternates, description: policy.intro };
  }
  return { title: `Policy: ${slug}` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "shipping") {
    return <ShippingPolicyView />;
  }
  if (slug === "safety-standards") {
    return <SafetyStandardsView />;
  }
  if (slug === "sustainability") {
    return <SustainabilityView />;
  }
  const policy = await getPolicyContent(slug);
  if (policy) {
    return <PolicyPageView content={policy} />;
  }
  return <StubPage title={`Policy: ${slug}`} />;
}
