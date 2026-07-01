import type { PolicyContent } from "./types";

/**
 * Terms & Conditions content. Standard, plain-language placeholder — review with
 * the store's real terms (and legal counsel) before relying on it.
 */
export const termsPolicy: PolicyContent = {
  slug: "terms",
  badge: "Terms",
  title: "Terms & Conditions",
  intro:
    "Please read these terms carefully. By using our website and placing an order, you agree to the terms below.",
  updated: "1 July 2026",
  summary: [
    { icon: "file-text", text: "Fair & transparent" },
    { icon: "package", text: "Clear order terms" },
    { icon: "credit-card", text: "Secure payments" },
    { icon: "scale", text: "Your rights protected" },
  ],
  sections: [
    {
      id: "overview",
      icon: "sparkles",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          text: "These terms govern your use of our website and your purchases from us. If you don't agree with them, please don't use the site.",
        },
      ],
    },
    {
      id: "using-our-site",
      icon: "globe",
      title: "Using Our Website",
      intro: "When you use our store, you agree to:",
      blocks: [
        {
          type: "list",
          items: [
            "Provide accurate account and order information",
            "Use the site lawfully and not disrupt its operation",
            "Be responsible for activity under your account",
          ],
        },
      ],
    },
    {
      id: "orders-pricing",
      icon: "package",
      title: "Orders & Pricing",
      intro: "A few things to know about ordering:",
      blocks: [
        {
          type: "checklist",
          items: [
            "An order is confirmed once we accept and process it",
            "Prices and availability may change without notice",
            "We may cancel or limit orders in case of errors or suspected fraud",
            "Applicable taxes and shipping fees are shown at checkout",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Pricing errors",
          text: "If a product is listed at an incorrect price, we may cancel the order and refund you in full — we'll always let you know first.",
        },
      ],
    },
    {
      id: "payments",
      icon: "credit-card",
      title: "Payments",
      blocks: [
        {
          type: "list",
          items: [
            "We accept the payment methods shown at checkout, including Cash on Delivery where available",
            "Payments are processed securely by our payment partners",
            "You confirm you're authorised to use your chosen payment method",
          ],
        },
      ],
    },
    {
      id: "intellectual-property",
      icon: "file-text",
      title: "Intellectual Property",
      blocks: [
        {
          type: "paragraph",
          text: "All content on this site — including text, images, logos, and designs — belongs to us or our licensors and may not be used without permission.",
        },
      ],
    },
    {
      id: "liability",
      icon: "scale",
      title: "Limitation of Liability",
      blocks: [
        {
          type: "paragraph",
          text: "We provide our website and products with care, but to the extent permitted by law, we are not liable for indirect or incidental losses arising from your use of the site or products.",
        },
        {
          type: "callout",
          tone: "warning",
          title: "Adult supervision",
          text: "Our toys are intended for use with appropriate adult supervision. Always follow the age guidance and safety information provided with each product.",
        },
      ],
    },
    {
      id: "changes",
      icon: "refresh-cw",
      title: "Changes to These Terms",
      blocks: [
        {
          type: "paragraph",
          text: "We may update these terms from time to time. The latest version will always be posted here with its effective date.",
        },
      ],
    },
  ],
  trust: [
    { icon: "shield-check", label: "Fair & transparent" },
    { icon: "credit-card", label: "Secure checkout" },
    { icon: "package", label: "Clear order terms" },
    { icon: "scale", label: "Your rights protected" },
  ],
  cta: {
    title: "Need a clarification?",
    text: "If anything here is unclear, our team is glad to help.",
    primary: { label: "Contact us", href: "/contact" },
    secondary: { label: "Email support", href: "mailto:hello@databrandix.com" },
  },
};
