import type { BlogCategory, BlogPost } from "@/lib/types";

/** Hub filter categories (chip order). */
export const blogCategories: BlogCategory[] = [
  { slug: "parenting", name: "Parenting" },
  { slug: "safety", name: "Safety" },
  { slug: "montessori", name: "Montessori" },
  { slug: "play", name: "Play" },
];

/** 6 mock posts. Each body has 4–6 blocks incl. at least one `h2` and one `ul`. */
export const blogPosts: BlogPost[] = [
  {
    slug: "neem-wood-safe-for-teething",
    title: "Why neem wood is safe for teething babies",
    excerpt:
      "Neem is naturally antibacterial and splinter-resistant — here's why it's a parent-favourite for teethers.",
    category: "safety",
    dateISO: "2026-05-12",
    readMins: 4,
    coverTone: "neem-soft",
    coverLabel: "Neem Wood",
    body: [
      {
        type: "p",
        text: "When a baby starts teething, everything goes straight to the mouth. That makes the material of a teether just as important as its shape.",
      },
      { type: "h2", text: "Why neem wood?" },
      {
        type: "p",
        text: "Neem is a dense hardwood with naturally antibacterial properties. It resists moisture and doesn't splinter easily, which makes it a gentle surface for sore gums.",
      },
      {
        type: "ul",
        items: [
          "Naturally antibacterial — no chemical coating needed",
          "Smooth, splinter-resistant grain",
          "Light enough for small hands to hold",
        ],
      },
      {
        type: "p",
        text: "We finish every teether with food-grade oil and nothing else, so there's no varnish or paint to worry about.",
      },
    ],
  },
  {
    slug: "montessori-toys-first-year",
    title: "5 Montessori toys for the first year",
    excerpt:
      "Simple, open-ended toys that match your baby's development from grasping to first steps.",
    category: "montessori",
    dateISO: "2026-05-02",
    readMins: 6,
    coverTone: "mustard",
    coverLabel: "First Year",
    body: [
      {
        type: "p",
        text: "Montessori toys aren't about flashing lights or batteries. They're simple objects that invite a baby to explore one idea at a time.",
      },
      { type: "h2", text: "Matching toys to milestones" },
      {
        type: "p",
        text: "In the first year a baby moves from tracking objects with their eyes, to grasping, then to sitting and pulling up. The right toy meets them where they are.",
      },
      {
        type: "ul",
        items: [
          "0–3m: high-contrast cards and a soft rattle",
          "3–6m: grasping rings and textured balls",
          "6–9m: stacking cups and an object-permanence box",
          "9–12m: a push trolley for early standing",
        ],
      },
      { type: "h2", text: "Less is more" },
      {
        type: "p",
        text: "Rotate a small set of toys instead of offering everything at once. Fewer choices help a baby focus and play for longer.",
      },
    ],
  },
  {
    slug: "choosing-toys-by-age",
    title: "Choosing toys by your child's age",
    excerpt:
      "A quick framework for picking toys that are challenging enough to engage, but never frustrating.",
    category: "parenting",
    dateISO: "2026-04-20",
    readMins: 5,
    coverTone: "dusty-blue",
    coverLabel: "By Age",
    body: [
      {
        type: "p",
        text: "The best toy is one that sits just ahead of what your child can already do — interesting, but not impossible.",
      },
      { type: "h2", text: "The 'just-right' challenge" },
      {
        type: "p",
        text: "Toys that are too easy get ignored; toys that are too hard get abandoned. Aim for the sweet spot in between.",
      },
      {
        type: "ul",
        items: [
          "Babies: cause-and-effect toys that respond to a simple action",
          "Toddlers: stacking, sorting and posting toys",
          "Older toddlers: simple puzzles and pretend-play sets",
        ],
      },
      {
        type: "p",
        text: "When in doubt, watch your child for a few minutes. They'll show you what they're working on.",
      },
    ],
  },
  {
    slug: "open-ended-play-matters",
    title: "Open-ended play: why it matters",
    excerpt:
      "Blocks, scarves and cups can become a hundred different games — and that's exactly the point.",
    category: "play",
    dateISO: "2026-04-08",
    readMins: 4,
    coverTone: "terracotta",
    coverLabel: "Open Play",
    body: [
      {
        type: "p",
        text: "Open-ended toys have no single 'right' way to play. A wooden block can be a phone, a car, a cake or a tower.",
      },
      { type: "h2", text: "What open-ended play builds" },
      {
        type: "ul",
        items: [
          "Imagination and storytelling",
          "Problem-solving and planning",
          "Independent, screen-free focus",
        ],
      },
      {
        type: "p",
        text: "Because the child sets the goal, they stay engaged far longer than they would with a single-purpose toy.",
      },
    ],
  },
  {
    slug: "how-we-keep-toys-non-toxic",
    title: "How we keep our toys non-toxic",
    excerpt:
      "From raw timber to finished toy, here's every step we take to keep our toys safe to chew.",
    category: "safety",
    dateISO: "2026-03-25",
    readMins: 5,
    coverTone: "neem",
    coverLabel: "Non-Toxic",
    body: [
      {
        type: "p",
        text: "Non-toxic isn't a label we add at the end — it's a decision made at every stage of how a toy is built.",
      },
      { type: "h2", text: "Our material rules" },
      {
        type: "ul",
        items: [
          "Sustainably sourced neem and hardwoods only",
          "Food-grade oil finishes, never varnish or paint",
          "Water-based, child-safe colours where colour is used",
        ],
      },
      { type: "h2", text: "Testing before it ships" },
      {
        type: "p",
        text: "Every batch is checked for smooth edges, secure parts and a clean finish before it reaches your home.",
      },
    ],
  },
  {
    slug: "screen-free-play-ideas",
    title: "Screen-free play ideas for toddlers",
    excerpt:
      "Ten-minute, no-screen activities that keep toddlers busy using things you already own.",
    category: "parenting",
    dateISO: "2026-03-10",
    readMins: 6,
    coverTone: "blush",
    coverLabel: "Screen-Free",
    body: [
      {
        type: "p",
        text: "Screen-free time doesn't have to mean elaborate setups. Some of the best activities use what's already in the kitchen drawer.",
      },
      { type: "h2", text: "Easy ideas to try today" },
      {
        type: "ul",
        items: [
          "A 'posting' game with a box and bottle lids",
          "Stacking and nesting measuring cups",
          "A basket of safe household objects to explore",
          "Simple pretend play — feeding a toy or a teddy",
        ],
      },
      {
        type: "p",
        text: "Rotate two or three of these through the week so they stay fresh.",
      },
      {
        type: "p",
        text: "The goal isn't to fill every minute — a little boredom sparks a lot of creativity.",
      },
    ],
  },
];

/** Resolve a post by slug (used by the dynamic route). */
export const blogPostBySlug = (slug: string): BlogPost | undefined =>
  blogPosts.find((p) => p.slug === slug);

/** Human-readable category name for a slug (falls back to the slug). */
export const categoryName = (slug: string): string =>
  blogCategories.find((c) => c.slug === slug)?.name ?? slug;

/**
 * Related posts: same category first, then fill with the most recent others,
 * always excluding the current post. Guarantees a non-empty result (up to limit).
 */
export const relatedPosts = (post: BlogPost, limit = 3): BlogPost[] =>
  blogPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .concat(
      blogPosts.filter(
        (p) => p.slug !== post.slug && p.category !== post.category,
      ),
    )
    .slice(0, limit);
