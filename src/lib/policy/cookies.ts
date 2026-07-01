import type { PolicyContent } from "./types";

/**
 * Cookie Policy content. Standard, plain-language placeholder — align with the
 * store's actual cookie/consent setup before relying on it.
 */
export const cookiesPolicy: PolicyContent = {
  slug: "cookies",
  badge: "Cookies",
  title: "Cookie Policy",
  intro:
    "This policy explains how we use cookies and similar technologies to keep our store working smoothly and improve your experience.",
  updated: "1 July 2026",
  summary: [
    { icon: "cookie", text: "Small text files" },
    { icon: "settings", text: "You choose" },
    { icon: "shield-check", text: "No selling data" },
    { icon: "eye", text: "Transparent use" },
  ],
  sections: [
    {
      id: "what-are-cookies",
      icon: "cookie",
      title: "What Are Cookies?",
      blocks: [
        {
          type: "paragraph",
          text: "Cookies are small text files stored on your device when you visit a website. They help the site remember your actions and preferences, so things work smoothly and feel personalised.",
        },
      ],
    },
    {
      id: "how-we-use",
      icon: "eye",
      title: "How We Use Cookies",
      intro: "We use cookies for a few clear purposes:",
      blocks: [
        {
          type: "list",
          items: [
            "Essential — to run the cart, checkout, and secure sign-in",
            "Functional — to remember your preferences, like your wishlist",
            "Analytics — to understand how the store is used and improve it",
            "Marketing — to show relevant offers, only with your consent",
          ],
        },
      ],
    },
    {
      id: "managing",
      icon: "settings",
      title: "Managing Your Preferences",
      intro: "You're always in control of non-essential cookies. You can:",
      blocks: [
        {
          type: "checklist",
          items: [
            "Adjust or reject cookies through your browser settings",
            "Update your consent choices at any time",
            "Disable analytics and marketing cookies without losing core features",
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Heads up",
          text: "Blocking essential cookies may affect how parts of the store work, such as the cart and checkout.",
        },
      ],
    },
    {
      id: "third-party",
      icon: "users",
      title: "Third-Party Cookies",
      blocks: [
        {
          type: "paragraph",
          text: "Some cookies are set by trusted third parties — for example, analytics or payment providers — to help us operate and improve the store. Their use of data is governed by their own privacy policies.",
        },
      ],
    },
  ],
  trust: [
    { icon: "shield-check", label: "No selling data" },
    { icon: "settings", label: "You're in control" },
    { icon: "eye", label: "Transparent use" },
    { icon: "lock", label: "Kept secure" },
  ],
  cta: {
    title: "Questions about cookies?",
    text: "We're happy to explain how cookies keep the store running.",
    primary: { label: "Contact us", href: "/contact" },
    secondary: { label: "Email support", href: "mailto:hello@databrandix.com" },
  },
};
