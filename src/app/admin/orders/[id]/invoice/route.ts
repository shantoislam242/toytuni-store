import { getIsAdmin } from "@/lib/auth/session";
import { getAdminOrderById } from "@/lib/admin/queries";
import { getSettings } from "@/lib/data/settings";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { BRAND_NAME } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const order = await getAdminOrderById(id);
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
