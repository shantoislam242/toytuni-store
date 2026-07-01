/**
 * Contact-page copy. Placeholder values for now — edit here in one place when
 * the real business details are available. Components map the `icon` strings to
 * lucide components (keeps JSX out of the data file).
 */

import type { ContactDetail, ContactFeature } from "@/lib/types";

export const contactInfo: ContactDetail[] = [
  {
    id: "address",
    icon: "map-pin",
    label: "Our Address",
    lines: ["House 21, Lake Drive Road, Sector 07", "Uttara, Dhaka-1230, Bangladesh"],
  },
  {
    id: "phone",
    icon: "phone",
    label: "Phone",
    lines: ["+880 1234-567890", "(10 AM – 6 PM, Sat - Thu)"],
  },
  {
    id: "email",
    icon: "mail",
    label: "Email",
    lines: ["hello@databrandix.com", "support@databrandix.com"],
  },
  {
    id: "hours",
    icon: "clock",
    label: "Working Hours",
    lines: ["Saturday – Thursday", "10:00 AM – 6:00 PM"],
  },
];

export const contactTrust: ContactFeature[] = [
  {
    id: "safe",
    icon: "baby",
    label: "Safe & Non-Toxic",
    desc: "All our toys are child-safe and non-toxic.",
  },
  {
    id: "sustainable",
    icon: "leaf",
    label: "Sustainable Materials",
    desc: "Made with natural wood and eco-friendly materials.",
  },
  {
    id: "quality",
    icon: "badge-check",
    label: "Quality You Can Trust",
    desc: "Carefully crafted for durability and endless play.",
  },
  {
    id: "loved",
    icon: "heart",
    label: "Loved by Parents",
    desc: "Join 300,000+ families who trust Databrandix.",
  },
];
