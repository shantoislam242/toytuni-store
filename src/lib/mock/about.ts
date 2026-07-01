/**
 * About Us content — configurable in one place. Icon keys map to lucide
 * components in the view (keeps JSX out of data). Brand name is referenced via
 * BRAND_NAME in the components, never hardcoded here.
 */

import type { Tone } from "@/lib/types";

export type AboutIcon =
  | "target"
  | "compass"
  | "shield-check"
  | "graduation-cap"
  | "leaf"
  | "badge-check"
  | "book-open"
  | "heart"
  | "blocks"
  | "shield"
  | "palette"
  | "recycle"
  | "person-standing"
  | "puzzle"
  | "hand";

export type AboutFeature = { id: string; icon: AboutIcon; title: string; desc: string };
export type AboutStat = {
  id: string;
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
};
export type AboutMilestone = { year: string; title: string; desc: string };
export type AboutGalleryItem = { id: string; tone: Tone; label: string };
export type AboutTestimonial = {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  tone: Tone;
};

/** Our Story — short, warm paragraphs. */
export const aboutStory: string[] = [
  "We started with a simple belief: that the best toys don't just entertain — they help a child discover the world. As parents ourselves, we searched for toys that were safe, beautiful, and genuinely good for little minds, and kept coming back to the Montessori approach.",
  "So we began making our own — handcrafted from natural neem wood, finished with non-toxic colours, and designed around how children actually learn: through play, at their own pace.",
  "Every toy we create is a small invitation to explore, build, and imagine — made to be loved today and passed on tomorrow.",
];

export const aboutMissionVision: AboutFeature[] = [
  {
    id: "mission",
    icon: "target",
    title: "Our Mission",
    desc: "To craft safe, natural toys that turn everyday play into meaningful learning — nurturing curiosity, independence, and joy in every child.",
  },
  {
    id: "vision",
    icon: "compass",
    title: "Our Vision",
    desc: "A world where every child grows through play they love, with toys that respect their development and our planet in equal measure.",
  },
];

export const aboutWhyChooseUs: AboutFeature[] = [
  { id: "safe", icon: "shield-check", title: "Child-Safe Materials", desc: "Non-toxic finishes and smooth, natural neem wood — safe for little hands and mouths." },
  { id: "montessori", icon: "graduation-cap", title: "Montessori Inspired", desc: "Designed around how children naturally learn, explore, and grow." },
  { id: "eco", icon: "leaf", title: "Eco-Friendly Design", desc: "Sustainably sourced wood and thoughtful, low-waste packaging." },
  { id: "quality", icon: "badge-check", title: "Quality Tested", desc: "Each toy is checked by hand for durability, finish, and safety." },
  { id: "educational", icon: "book-open", title: "Educational Value", desc: "Play that builds real skills — focus, coordination, and problem solving." },
  { id: "loved", icon: "heart", title: "Loved by Families", desc: "Trusted by hundreds of thousands of parents and their little ones." },
];

export const aboutValues: AboutFeature[] = [
  { id: "play", icon: "blocks", title: "Learning Through Play", desc: "The best learning feels like play — so we design for both." },
  { id: "safety", icon: "shield", title: "Safety First", desc: "Every material and edge is chosen with your child in mind." },
  { id: "creativity", icon: "palette", title: "Creativity", desc: "Open-ended toys that spark imagination, not just instructions." },
  { id: "sustainability", icon: "recycle", title: "Sustainability", desc: "Natural materials and practices that respect the planet." },
];

export const aboutPhilosophy: AboutFeature[] = [
  { id: "independence", icon: "person-standing", title: "Independence", desc: "Toys sized and designed for children to explore on their own." },
  { id: "creativity", icon: "palette", title: "Creativity", desc: "Open-ended play that invites imagination and self-expression." },
  { id: "problem-solving", icon: "puzzle", title: "Problem Solving", desc: "Gentle challenges that build reasoning and persistence." },
  { id: "motor", icon: "hand", title: "Fine Motor Skills", desc: "Grasping, stacking, and sorting that strengthen little hands." },
  { id: "concentration", icon: "target", title: "Concentration", desc: "Absorbing, purposeful play that grows focus and calm." },
];

export const aboutJourney: AboutMilestone[] = [
  { year: "2023", title: "Brand Founded", desc: "A small workshop and a big belief in better play." },
  { year: "2024", title: "100 Products", desc: "Our handmade collection grew, toy by toy." },
  { year: "2025", title: "10,000 Happy Families", desc: "Homes across the country filled with our toys." },
  { year: "2026", title: "Expanded Nationwide", desc: "Delivering joy to little hands everywhere." },
];

export const aboutStats: AboutStat[] = [
  { id: "families", target: 300, suffix: "K+", label: "Happy Families" },
  { id: "products", target: 500, suffix: "+", label: "Educational Products" },
  { id: "reviews", target: 98, suffix: "%", label: "Positive Reviews" },
  { id: "support", target: 24, suffix: "/7", label: "Customer Support" },
];

export const aboutGallery: AboutGalleryItem[] = [
  { id: "g1", tone: "neem-soft", label: "Stacking rings" },
  { id: "g2", tone: "mustard", label: "Shape sorter" },
  { id: "g3", tone: "blush", label: "Little hands at play" },
  { id: "g4", tone: "dusty-blue", label: "Wooden blocks" },
  { id: "g5", tone: "wood", label: "Neem-wood toys" },
  { id: "g6", tone: "cream", label: "Montessori shelf" },
];

export const aboutTestimonials: AboutTestimonial[] = [
  {
    id: "t1",
    name: "Farhana H.",
    location: "Dhaka",
    quote: "The quality is unreal — beautiful, sturdy, and my son is genuinely absorbed for hours. You can feel the care in every piece.",
    rating: 5,
    tone: "neem-soft",
  },
  {
    id: "t2",
    name: "Imran S.",
    location: "Chattogram",
    quote: "Finally, toys I feel good about. Natural materials, no worries about safety, and my daughter loves them.",
    rating: 5,
    tone: "mustard",
  },
  {
    id: "t3",
    name: "Rumana K.",
    location: "Sylhet",
    quote: "You can tell these are made by people who understand children. Simple, beautiful, and full of learning.",
    rating: 5,
    tone: "blush",
  },
];
