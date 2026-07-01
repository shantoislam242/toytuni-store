import type { PolicyContent } from "./types";

/**
 * Warranty Policy content. Standard placeholder — confirm the real warranty
 * period and terms before relying on it.
 */
export const warrantyPolicy: PolicyContent = {
  slug: "warranty",
  badge: "Warranty",
  title: "Warranty Policy",
  intro:
    "Handmade to last. Every toy is covered against manufacturing defects, so you can play with peace of mind.",
  updated: "1 July 2026",
  summary: [
    { icon: "shield-check", text: "Covered against defects" },
    { icon: "clock", text: "6-month warranty" },
    { icon: "wrench", text: "Repair or replace" },
    { icon: "badge-check", text: "Quality assured" },
  ],
  sections: [
    {
      id: "overview",
      icon: "sparkles",
      title: "Overview",
      blocks: [
        {
          type: "paragraph",
          text: "Our toys are crafted from natural neem wood by skilled hands. We stand behind that craftsmanship with a warranty against manufacturing defects for 6 months from the date of delivery.",
        },
      ],
    },
    {
      id: "whats-covered",
      icon: "check-circle",
      title: "What's Covered",
      intro: "The warranty covers defects in materials and workmanship, such as:",
      blocks: [
        {
          type: "checklist",
          items: [
            "Structural breakage during normal, intended use",
            "Joints or parts that come loose due to a production fault",
            "Finish defects present at the time of delivery",
          ],
        },
      ],
    },
    {
      id: "whats-not-covered",
      icon: "x-circle",
      title: "What's Not Covered",
      intro: "The warranty does not cover:",
      blocks: [
        {
          type: "list",
          items: [
            "Normal wear and tear from everyday play",
            "Accidental damage, misuse, or rough handling",
            "Water damage or prolonged exposure to moisture",
            "Alterations, repairs, or repainting done outside our workshop",
            "Claims made after the warranty period has ended",
          ],
        },
      ],
    },
    {
      id: "how-to-claim",
      icon: "rotate-ccw",
      title: "How to Make a Claim",
      blocks: [
        {
          type: "steps",
          items: [
            {
              title: "Contact us",
              text: "Reach out with your order number and a short description of the issue.",
            },
            {
              title: "Share photos",
              text: "Send a couple of clear photos of the defect so we can assess it quickly.",
            },
            {
              title: "We review",
              text: "Our team confirms whether the issue is covered under warranty.",
            },
            {
              title: "Repair, replace, or refund",
              text: "If approved, we'll repair the toy, send a replacement, or issue a refund.",
            },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: "Keep your proof of purchase",
          text: "Please keep your order number or receipt — it's needed to validate any warranty claim.",
        },
      ],
    },
  ],
  trust: [
    { icon: "shield-check", label: "Defect protection" },
    { icon: "wrench", label: "Repair or replace" },
    { icon: "badge-check", label: "Handmade quality" },
    { icon: "leaf", label: "Natural neem wood" },
  ],
  cta: {
    title: "Need to make a claim?",
    text: "Our team will help you sort out any warranty issue quickly.",
    primary: { label: "Contact us", href: "/contact" },
    secondary: { label: "Email support", href: "mailto:hello@databrandix.com" },
  },
};
