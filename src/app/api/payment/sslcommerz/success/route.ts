import { NextResponse, type NextRequest } from "next/server";
import { handlePaidCallback } from "@/lib/payments/handle-callback";

/**
 * SSLCommerz success redirect (browser POSTs here). We re-validate the
 * transaction server-to-server before trusting it, then bounce the shopper to
 * the confirmation page. `status` there reflects the VERIFIED outcome, not the
 * (spoofable) redirect.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const { ok, orderNumber } = await handlePaidCallback(form);
  const url = new URL("/checkout/complete", req.url);
  if (orderNumber) url.searchParams.set("order", orderNumber);
  url.searchParams.set("status", ok ? "paid" : "failed");
  return NextResponse.redirect(url, 303);
}
