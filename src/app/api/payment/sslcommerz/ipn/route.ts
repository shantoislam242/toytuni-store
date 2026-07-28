import { type NextRequest } from "next/server";
import { handlePaidCallback, handleVoidCallback } from "@/lib/payments/handle-callback";

/**
 * SSLCommerz IPN — server-to-server notification (the authoritative,
 * browser-independent settlement path; covers the case where the shopper closes
 * the tab before the success redirect fires). Idempotent with the success
 * route: whichever arrives first settles, the other short-circuits. Always
 * returns 200 so the gateway doesn't retry a handled notification.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const status = String(form.get("status") ?? "").trim();

  if (status === "VALID" || status === "VALIDATED") {
    await handlePaidCallback(form);
  } else if (status === "FAILED" || status === "CANCELLED") {
    await handleVoidCallback(form, `Payment ${status.toLowerCase()}`);
  }
  return new Response("OK");
}
