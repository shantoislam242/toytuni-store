/**
 * Per-product "Expert Insight" sources for the product page popover. Each entry is a
 * verified, live, authoritative external page about that toy type / developmental skill
 * (AAP HealthyChildren, ZERO TO THREE). Sources are about the toy TYPE — the catalogue is
 * generic Montessori toys, not branded SKUs. Every URL was WebFetch-checked live and
 * on-topic; all 16 are distinct. Update a link by editing only this file.
 */
export type ExpertInsight = {
  /** Absolute https URL to a live, authoritative page. */
  url: string;
  /** Human-readable source name, e.g. "HealthyChildren.org (AAP)". */
  source: string;
};

export const expertInsights: Record<string, ExpertInsight> = {
  "neem-rattle-set": {
    url: "https://www.healthychildren.org/English/family-life/power-of-play/Pages/simple-ways-to-entertain-and-boost-your-babys-development-at-home.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "stacking-ring-tower": {
    url: "https://www.zerotothree.org/resource/stages-of-play-from-12-24-months-young-toddlers-are-problem-solvers/",
    source: "ZERO TO THREE",
  },
  "wooden-shape-sorter": {
    url: "https://www.zerotothree.org/resource/shape-sorting/",
    source: "ZERO TO THREE",
  },
  "pull-along-duck": {
    url: "https://www.healthychildren.org/English/ages-stages/baby/Pages/Movement-8-to-12-Months.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "neem-teether-ring": {
    url: "https://www.healthychildren.org/English/ages-stages/baby/teething-tooth-care/Pages/Teething-Pain.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "building-block-set": {
    url: "https://www.healthychildren.org/English/ages-stages/toddler/Pages/Hand-and-Finger-Skills-1-Year-Olds.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "object-permanence-box": {
    url: "https://www.zerotothree.org/resource/supporting-thinking-skills-from-0-12-months/",
    source: "ZERO TO THREE",
  },
  "rocker-ride-horse": {
    url: "https://www.healthychildren.org/English/ages-stages/baby/Pages/What-to-Look-for-in-a-Toy.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "sensory-ball-set": {
    url: "https://www.zerotothree.org/resource/babies-and-their-senses/",
    source: "ZERO TO THREE",
  },
  "animal-puzzle": {
    url: "https://www.zerotothree.org/resource/building-problem-solving-skills-gather-round-activities/",
    source: "ZERO TO THREE",
  },
  "soft-cloth-book": {
    url: "https://www.healthychildren.org/English/ages-stages/baby/Pages/Developmental-Milestones-of-Early-Literacy.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "wooden-xylophone": {
    url: "https://www.zerotothree.org/resource/distillation/beyond-twinkle-twinkle-using-music-with-infants-and-toddlers/",
    source: "ZERO TO THREE",
  },
  "lacing-beads-set": {
    url: "https://www.zerotothree.org/resource/play-activities-for-12-to-24-months/",
    source: "ZERO TO THREE",
  },
  "baby-gym-arch": {
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/back-to-sleep-tummy-to-play.aspx",
    source: "HealthyChildren.org (AAP)",
  },
  "counting-abacus": {
    url: "https://www.zerotothree.org/resource/help-your-child-develop-early-math-skills/",
    source: "ZERO TO THREE",
  },
  "nesting-cups": {
    url: "https://www.zerotothree.org/resource/developing-thinking-skills-from-12-24-months/",
    source: "ZERO TO THREE",
  },
};

/** Fallback when a slug is missing (safety only; all 16 products are mapped). */
export const DEFAULT_EXPERT_INSIGHT: ExpertInsight = {
  url: "https://www.healthychildren.org/English/ages-stages/Pages/default.aspx",
  source: "HealthyChildren.org (AAP)",
};
