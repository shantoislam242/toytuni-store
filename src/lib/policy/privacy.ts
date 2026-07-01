import type { PolicyContent } from "./types";

/**
 * Privacy Policy content. Standard, plain-language placeholder — review with the
 * store's real data practices (and legal counsel) before relying on it.
 */
export const privacyPolicy: PolicyContent = {
  slug: "privacy",
  badge: "Privacy",
  title: "Privacy Policy",
  intro:
    "Your trust matters to us. This policy explains what information we collect, how we use it, and the choices you have.",
  updated: "1 July 2026",
  summary: [
    { icon: "shield-check", text: "We never sell your data" },
    { icon: "lock", text: "Encrypted & secured" },
    { icon: "eye", text: "You control your data" },
    { icon: "mail", text: "Opt out anytime" },
  ],
  sections: [
    {
      id: "overview",
      icon: "sparkles",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          text: "We collect only what we need to fulfil your orders and give you a great experience — and we protect it carefully. This policy describes the information we handle and why.",
        },
        {
          type: "paragraph",
          text: "By using our website and placing an order, you agree to the practices described here.",
        },
      ],
    },
    {
      id: "information-we-collect",
      icon: "file-text",
      title: "Information We Collect",
      intro: "Depending on how you use our store, we may collect:",
      blocks: [
        {
          type: "list",
          items: [
            "Contact details — your name, email, phone, and delivery address",
            "Order information — the items you buy and your order history",
            "Payment details — processed securely by our payment partners (we don't store full card numbers)",
            "Device & usage data — browser, device, and how you use our site",
            "Communications — messages you send us for support or inquiries",
          ],
        },
      ],
    },
    {
      id: "how-we-use",
      icon: "eye",
      title: "How We Use Your Information",
      intro: "We use your information to:",
      blocks: [
        {
          type: "checklist",
          items: [
            "Process, deliver, and support your orders",
            "Keep your account and purchases secure",
            "Improve our products, store, and service",
            "Send updates and offers — only with your consent",
            "Prevent fraud and meet legal obligations",
          ],
        },
      ],
    },
    {
      id: "sharing",
      icon: "users",
      title: "How We Share Information",
      intro: "We share data only with partners who help us run the store:",
      blocks: [
        {
          type: "list",
          items: [
            "Courier and logistics partners, to deliver your order",
            "Payment processors, to handle transactions securely",
            "Service providers who support our operations, under confidentiality",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "We never sell your data",
          text: "We do not sell or rent your personal information to third parties for their own marketing.",
        },
      ],
    },
    {
      id: "cookies",
      icon: "cookie",
      title: "Cookies",
      blocks: [
        {
          type: "paragraph",
          text: "We use cookies and similar technologies to keep the site working, remember your preferences, and understand how the store is used. You can learn more and manage your choices in our Cookie Policy.",
        },
      ],
    },
    {
      id: "your-rights",
      icon: "shield-check",
      title: "Your Rights & Choices",
      intro: "You're in control of your information. You can:",
      blocks: [
        {
          type: "checklist",
          items: [
            "Access the personal data we hold about you",
            "Ask us to correct or update your details",
            "Request deletion of your data, where applicable",
            "Opt out of marketing emails at any time",
          ],
        },
      ],
    },
    {
      id: "security",
      icon: "lock",
      title: "Data Security",
      blocks: [
        {
          type: "paragraph",
          text: "We use appropriate technical and organisational measures to protect your information. No method of transmission over the internet is completely secure, but we work hard to safeguard your data.",
        },
      ],
    },
  ],
  trust: [
    { icon: "lock", label: "Encrypted & secured" },
    { icon: "shield-check", label: "Never sold" },
    { icon: "eye", label: "Your control" },
    { icon: "mail", label: "Opt out anytime" },
  ],
  cta: {
    title: "Questions about your privacy?",
    text: "We're happy to explain how we handle your data or help with a request.",
    primary: { label: "Contact us", href: "/contact" },
    secondary: { label: "Email support", href: "mailto:hello@databrandix.com" },
  },
};
