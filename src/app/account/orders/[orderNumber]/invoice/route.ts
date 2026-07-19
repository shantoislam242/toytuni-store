import { getSessionUser } from "@/lib/auth/session";
import { getOrderForEmail } from "@/lib/data/account";
import { getSettings } from "@/lib/data/settings";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { BRAND_NAME } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Invoice PDF for a signed-in customer's own order. Mirrors the OP-1 admin
 * invoice route, but ownership-gated: `getOrderForEmail` scopes by BOTH the
 * session's (server-verified) email and the order number, so a signed-in
 * customer can never fetch another customer's invoice by guessing an order
 * number in the URL.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderNumber: string }> },
) {
  const user = await getSessionUser();
  if (!user?.email) return new Response("Unauthorized", { status: 401 });

  const { orderNumber } = await params;
  const order = await getOrderForEmail(user.email, orderNumber);
  if (!order) return new Response("Not found", { status: 404 });

  const settings = await getSettings();
  const data = buildInvoiceData(order, settings, BRAND_NAME);
  const pdf = await generateInvoicePdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    },
  });
}
