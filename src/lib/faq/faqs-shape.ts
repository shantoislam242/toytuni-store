/** FAQ types shared by the storefront explorer, the DB read, and the admin
 *  editor. `category` is stored free-text but the admin picks from the
 *  canonical `FAQ_CATEGORIES` list. */

export type FaqCategory = "Orders" | "Shipping" | "Returns" | "Products" | "Payments" | "Bulk Orders";

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Orders", "Shipping", "Returns", "Products", "Payments", "Bulk Orders",
];

export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
  link?: { label: string; href: string };
};

/** Admin view of a FAQ row (adds the edit-only fields). */
export type AdminFaq = FaqItem & { active: boolean; sort: number };

/** Admin-supplied FAQ fields (create/update). `linkLabel`/`linkHref` blank = no link. */
export type FaqInput = {
  category: string;
  question: string;
  answer: string;
  linkLabel: string;
  linkHref: string;
  active: boolean;
};

/** DB row shape (`faqs` postpends the generated types — migration 0026). */
export type FaqRow = {
  id: string;
  category: string;
  question: string;
  answer: string;
  link_label: string | null;
  link_href: string | null;
  active: boolean;
  sort: number;
};

/** Map a DB row to an `AdminFaq`; the storefront just reads the `FaqItem` part.
 *  A link is present only when a href is set (label falls back to the href). */
export function rowToFaq(r: FaqRow): AdminFaq {
  return {
    id: r.id,
    category: r.category,
    question: r.question,
    answer: r.answer,
    link: r.link_href ? { label: r.link_label || r.link_href, href: r.link_href } : undefined,
    active: r.active,
    sort: r.sort,
  };
}
