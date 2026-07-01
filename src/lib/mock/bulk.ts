import type { BulkBenefit, BulkProgram, BulkStep, BulkTier } from "@/lib/types";

export const bulkPrograms: BulkProgram[] = [
  {
    id: "preschool",
    titleBn: "Preschool",
    descBn: "Montessori-ready toys for preschools and daycares, at special pricing.",
    href: "/bulk#preschool",
    tone: "neem-soft",
  },
  {
    id: "retail",
    titleBn: "Retail",
    descBn: "Wholesale rates and steady stock support for shops and resellers.",
    href: "/bulk#retail",
    tone: "mustard",
  },
];

/** Three wholesale program tiers shown on the /bulk page. Placeholder copy —
 *  edit here in one place when real program details are available. */
export const bulkTiers: BulkTier[] = [
  {
    id: "preschool",
    icon: "school",
    titleBn: "Preschool",
    descBn:
      "Montessori-ready toys for preschools, daycares, and learning centres — at institutional pricing.",
    points: [
      "Special education pricing",
      "Curriculum-friendly toy sets",
      "Trusted by 250+ preschools",
    ],
    tone: "neem-soft",
  },
  {
    id: "retail",
    icon: "store",
    titleBn: "Retail",
    descBn:
      "Wholesale rates and steady stock support for toy shops, boutiques, and resellers.",
    points: [
      "Wholesale margins",
      "Reliable restocking",
      "Retail-ready packaging",
    ],
    tone: "mustard",
  },
  {
    id: "international",
    icon: "globe",
    titleBn: "International",
    descBn:
      "Export orders for distributors and stores overseas, with documentation and shipping support.",
    points: [
      "Export documentation",
      "Freight & logistics help",
      "Flexible order volumes",
    ],
    tone: "dusty-blue",
  },
];

/** "Why partner with us" benefits. */
export const bulkBenefits: BulkBenefit[] = [
  {
    id: "pricing",
    icon: "tag",
    titleBn: "Wholesale Pricing",
    descBn: "Volume-based rates that scale with your order size.",
  },
  {
    id: "support",
    icon: "headset",
    titleBn: "Dedicated Support",
    descBn: "A single point of contact for quotes, orders, and reorders.",
  },
  {
    id: "safe",
    icon: "shield-check",
    titleBn: "Certified & Child-Safe",
    descBn: "Non-toxic, natural neem-wood toys built to safety standards.",
  },
  {
    id: "stock",
    icon: "truck",
    titleBn: "Reliable Stock",
    descBn: "Consistent availability and restocking you can plan around.",
  },
];

/** "How it works" process steps (numbered in the view by array order). */
export const bulkSteps: BulkStep[] = [
  {
    id: "inquire",
    titleBn: "Send an inquiry",
    descBn: "Tell us your program, quantities, and timeline using the form below.",
  },
  {
    id: "quote",
    titleBn: "We tailor a quote",
    descBn: "Our team prepares pricing and a product selection for your needs.",
  },
  {
    id: "confirm",
    titleBn: "Confirm & pay",
    descBn: "Approve the quote and complete payment through a convenient method.",
  },
  {
    id: "deliver",
    titleBn: "Delivery & restock",
    descBn: "We ship your order and support ongoing restocking as you grow.",
  },
];

/** Placeholder bulk-desk contact shown beside the inquiry form. */
export const bulkContact = {
  phone: "+880 1234-567890",
  email: "wholesale@databrandix.com",
  hoursBn: "Sat – Thu, 10 AM – 6 PM",
};
