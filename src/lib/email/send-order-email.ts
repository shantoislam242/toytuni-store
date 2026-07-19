import "server-only";
import { getResend, EMAIL_FROM } from "./resend-client";
import { renderOrderEmail, type OrderEmailKind, type OrderEmailData } from "./order-email-templates";

export async function sendOrderEmail(
  kind: OrderEmailKind, data: OrderEmailData,
  attachInvoice?: { filename: string; content: Buffer },
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend || !data.customerEmail) return; // no key / no recipient → no-op
    const { subject, html } = renderOrderEmail(kind, data);
    await resend.emails.send({
      from: EMAIL_FROM, to: data.customerEmail, subject, html,
      attachments: attachInvoice ? [{ filename: attachInvoice.filename, content: attachInvoice.content }] : undefined,
    });
  } catch (err) {
    console.error(`sendOrderEmail(${kind}) failed for ${data.orderNumber}:`, err);
  }
}
