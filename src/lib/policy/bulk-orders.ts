import type { PolicyContent } from "./types";

/**
 * Bulk Order Policy content. Placeholder terms — confirm real MOQs, pricing, and
 * lead times. Pairs with the /bulk landing page.
 */
export const bulkOrdersPolicy: PolicyContent = {
  slug: "bulk-orders",
  badge: "Bulk Orders",
  title: "Bulk Order Policy",
  intro:
    "Ordering in volume for a school, shop, or event? Here's how our wholesale and bulk ordering works.",
  updated: "1 July 2026",
  summary: [
    { icon: "package", text: "Volume pricing" },
    { icon: "truck", text: "Reliable supply" },
    { icon: "wallet", text: "Flexible payment" },
    { icon: "badge-check", text: "Dedicated support" },
  ],
  sections: [
    {
      id: "overview",
      icon: "sparkles",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          text: "We work with preschools, retailers, and distributors to supply safe, natural neem-wood toys in volume. This policy outlines how bulk and wholesale orders are handled.",
        },
        {
          type: "callout",
          tone: "info",
          title: "Start here",
          text: "You can request a wholesale quote any time from our Bulk / B2B page — just tell us your program, quantities, and timeline.",
        },
      ],
    },
    {
      id: "minimum-orders",
      icon: "package",
      title: "Minimum Orders",
      intro: "Bulk pricing applies once your order meets our minimum quantities:",
      blocks: [
        {
          type: "list",
          items: [
            "Minimum order quantities vary by product and program",
            "Preschool, Retail, and International programs each have their own terms",
            "Your exact minimums are confirmed in your quote",
          ],
        },
      ],
    },
    {
      id: "pricing",
      icon: "wallet",
      title: "Pricing & Quotes",
      blocks: [
        {
          type: "checklist",
          items: [
            "Volume-based rates that scale with your order size",
            "A tailored quote is prepared for every bulk request",
            "Quotes are valid for a limited period, noted on the quote",
          ],
        },
      ],
    },
    {
      id: "lead-time",
      icon: "truck",
      title: "Lead Time & Delivery",
      intro: "Because bulk orders are made and packed in larger quantities:",
      blocks: [
        {
          type: "list",
          items: [
            "Lead times are longer than standard retail orders and confirmed per order",
            "We coordinate delivery to your location, domestic or international",
            "Shipping is quoted separately based on weight and destination",
          ],
        },
      ],
    },
    {
      id: "payment-terms",
      icon: "credit-card",
      title: "Payment Terms",
      blocks: [
        {
          type: "list",
          items: [
            "An advance may be required to confirm production for large orders",
            "Accepted payment methods are shared with your quote",
            "Any applicable taxes and duties are the buyer's responsibility",
          ],
        },
      ],
    },
    {
      id: "how-to-order",
      icon: "rotate-ccw",
      title: "How to Place a Bulk Order",
      blocks: [
        {
          type: "steps",
          items: [
            {
              title: "Send an inquiry",
              text: "Share your program, quantities, and timeline through our Bulk / B2B page.",
            },
            {
              title: "Receive a quote",
              text: "We prepare tailored pricing and a product selection for your needs.",
            },
            {
              title: "Confirm & pay",
              text: "Approve the quote and complete payment to start production.",
            },
            {
              title: "Delivery & restock",
              text: "We ship your order and support ongoing restocking as you grow.",
            },
          ],
        },
      ],
    },
  ],
  trust: [
    { icon: "wallet", label: "Volume pricing" },
    { icon: "truck", label: "Reliable supply" },
    { icon: "badge-check", label: "Dedicated support" },
    { icon: "leaf", label: "Natural neem wood" },
  ],
  cta: {
    title: "Ready to order in bulk?",
    text: "Tell us what you need and we'll put together a wholesale quote.",
    primary: { label: "Request a quote", href: "/bulk" },
    secondary: { label: "Email us", href: "mailto:hello@databrandix.com" },
  },
};
