import type { Metadata } from "next";
import { getAdminCoupons } from "@/lib/admin/queries";
import { CouponsManager } from "@/components/admin/coupons-manager";

export function generateMetadata(): Metadata {
  return {
    title: "Coupons",
    robots: { index: false, follow: false },
  };
}

/** Admin Coupons page — any admin (gated by the admin layout). Lists every
 *  coupon and lets an admin create / edit / delete them via `CouponsManager`
 *  (all writes go through the `getIsAdmin()`-gated Server Actions). */
export default async function Page() {
  const coupons = await getAdminCoupons();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Coupons</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Discount codes customers can apply at checkout.
      </p>

      <div className="mt-6">
        <CouponsManager coupons={coupons} />
      </div>
    </div>
  );
}
