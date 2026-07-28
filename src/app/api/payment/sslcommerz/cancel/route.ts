import { NextResponse, type NextRequest } from "next/server";
import { handleVoidCallback } from "@/lib/payments/handle-callback";

/** SSLCommerz cancel redirect (shopper backed out). Void the pending order
 *  (restore stock) and send them to the confirmation page as cancelled. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const orderNumber = await handleVoidCallback(form, "Payment cancelled by customer");
  const url = new URL("/checkout/complete", req.url);
  if (orderNumber) url.searchParams.set("order", orderNumber);
  url.searchParams.set("status", "cancelled");
  return NextResponse.redirect(url, 303);
}
