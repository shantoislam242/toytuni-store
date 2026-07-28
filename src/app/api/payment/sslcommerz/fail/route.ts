import { NextResponse, type NextRequest } from "next/server";
import { handleVoidCallback } from "@/lib/payments/handle-callback";

/** SSLCommerz failure redirect. Void the pending order (restore stock) and send
 *  the shopper to the confirmation page with a failed status so they can retry. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const orderNumber = await handleVoidCallback(form, "Payment failed");
  const url = new URL("/checkout/complete", req.url);
  if (orderNumber) url.searchParams.set("order", orderNumber);
  url.searchParams.set("status", "failed");
  return NextResponse.redirect(url, 303);
}
