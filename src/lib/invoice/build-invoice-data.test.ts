// src/lib/invoice/build-invoice-data.test.ts
import { describe, it, expect } from "vitest";
import { buildInvoiceData } from "./build-invoice-data";

const settings = {
  contact: { phone: "+880111", email: "hello@toytuni.com", address: "Dhaka, BD", whatsapp: "" },
  brand: { tagline: "Play. Learn. Grow.", description: "" },
  shipping: { insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000 },
  codFee: 0,
} as const;

const order = {
  orderNumber: "TT-ABC", createdAt: "2026-07-19T10:00:00.000Z",
  status: "shipped", paymentStatus: "paid",
  customerName: "Rima", customerPhone: "+880999", customerEmail: "rima@x.com",
  division: "Dhaka", district: "Dhaka", area: "Mirpur", addressLine: "Road 1", landmark: "Near mosque",
  items: [{ title: "Blocks", qty: 2, unitPrice: 500, lineTotal: 1000 }],
  subtotal: 1000, deliveryFee: 80, advanceTotal: 0, total: 1080, paymentMethod: "cod",
};

describe("buildInvoiceData", () => {
  it("maps order + settings into invoice data", () => {
    const d = buildInvoiceData(order, settings, "toytuni");
    expect(d.orderNumber).toBe("TT-ABC");
    expect(d.from.name).toBe("toytuni");
    expect(d.from.phone).toBe("+880111");
    expect(d.to.name).toBe("Rima");
    expect(d.to.address).toContain("Road 1");
    expect(d.to.address).toContain("Mirpur");
    expect(d.items).toHaveLength(1);
    expect(d.total).toBe(1080);
    expect(d.paymentStatusLabel).toBe("Paid");
    expect(d.orderStatusLabel).toBe("Shipped");
  });
  it("labels an unpaid pending order", () => {
    const d = buildInvoiceData({ ...order, paymentStatus: "pending", status: "pending" }, settings, "toytuni");
    expect(d.paymentStatusLabel).toBe("Pending");
    expect(d.orderStatusLabel).toBe("Pending");
  });
  it("omits landmark cleanly when absent", () => {
    const d = buildInvoiceData({ ...order, landmark: null }, settings, "toytuni");
    expect(d.to.address).not.toContain("null");
  });
});
