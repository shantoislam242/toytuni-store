// src/lib/invoice/build-invoice-data.ts
export type InvoiceItem = { title: string; qty: number; unitPrice: number; lineTotal: number };
export type InvoiceData = {
  orderNumber: string;
  dateIso: string;
  paymentStatusLabel: string;
  orderStatusLabel: string;
  from: { name: string; tagline?: string; phone: string; email: string; address: string };
  to: { name: string; phone: string; email?: string; address: string };
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  advanceTotal: number;
  /** Coupon discount (BDT) subtracted from the total; 0 when no coupon. */
  discountTotal: number;
  total: number;
};

type OrderLike = {
  orderNumber: string; createdAt: string; status: string; paymentStatus: string;
  customerName: string; customerPhone: string; customerEmail?: string | null;
  division: string; district: string; area: string; addressLine: string; landmark?: string | null;
  items: { title: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number; deliveryFee: number; advanceTotal: number; total: number;
  /** Optional — older callers/orders without a coupon omit it (treated as 0). */
  discountTotal?: number;
};
type SettingsLike = { contact: { phone: string; email: string; address: string }; brand: { tagline: string } };

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function buildInvoiceData(order: OrderLike, settings: SettingsLike, storeName: string): InvoiceData {
  const toAddress = [order.addressLine, order.landmark, `${order.area}, ${order.district}, ${order.division}`]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join("\n");
  return {
    orderNumber: order.orderNumber,
    dateIso: order.createdAt,
    paymentStatusLabel: cap(order.paymentStatus),
    orderStatusLabel: cap(order.status),
    from: {
      name: storeName, tagline: settings.brand.tagline,
      phone: settings.contact.phone, email: settings.contact.email, address: settings.contact.address,
    },
    to: {
      name: order.customerName, phone: order.customerPhone,
      email: order.customerEmail ?? undefined, address: toAddress,
    },
    items: order.items.map((i) => ({ title: i.title, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
    subtotal: order.subtotal, deliveryFee: order.deliveryFee, advanceTotal: order.advanceTotal,
    discountTotal: order.discountTotal ?? 0, total: order.total,
  };
}
