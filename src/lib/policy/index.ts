import { bulkOrdersPolicy } from "./bulk-orders";
import { cookiesPolicy } from "./cookies";
import { privacyPolicy } from "./privacy";
import { returnsPolicy } from "./returns";
import { termsPolicy } from "./terms";
import type { PolicyContent } from "./types";
import { warrantyPolicy } from "./warranty";

export type { PolicyContent } from "./types";

/**
 * Registry of policy pages keyed by route slug. Add a new premium policy page by
 * authoring a `PolicyContent` module and registering it here — the reusable
 * template and route dispatch handle the rest. `refund` is an alias for the
 * combined Returns & Refund page (both slugs are linked in the footer).
 */
export const policyRegistry: Record<string, PolicyContent> = {
  returns: returnsPolicy,
  refund: returnsPolicy,
  privacy: privacyPolicy,
  terms: termsPolicy,
  warranty: warrantyPolicy,
  cookies: cookiesPolicy,
  "bulk-orders": bulkOrdersPolicy,
};

export function getPolicy(slug: string): PolicyContent | undefined {
  return policyRegistry[slug];
}
