import { describe, it, expect } from "vitest";
import { renderOrderEmail } from "./order-email-templates";

const base = {
  orderNumber: "TT-ABC", customerName: "Rima", customerEmail: "r@x.com", status: "pending",
  items: [{ title: "Blocks", qty: 2, lineTotal: 1000 }],
  subtotal: 1000, deliveryFee: 80, advanceTotal: 0, total: 1080,
};

describe("renderOrderEmail", () => {
  it("placed: subject + order number + Tk total, no undefined", () => {
    const { subject, html } = renderOrderEmail("placed", base);
    expect(subject).toContain("TT-ABC");
    expect(html).toContain("Tk 1,080");
    expect(html).toContain("Blocks");
    expect(html).not.toMatch(/undefined|NaN/);
  });
  it("shipped: includes carrier + tracking when present", () => {
    const { subject, html } = renderOrderEmail("shipped", { ...base, status: "shipped", carrier: "Pathao", trackingNumber: "TN1" });
    expect(subject.toLowerCase()).toContain("shipped");
    expect(html).toContain("Pathao");
    expect(html).toContain("TN1");
  });
  it("delivered + cancelled have distinct subjects", () => {
    expect(renderOrderEmail("delivered", { ...base, status: "delivered" }).subject.toLowerCase()).toContain("delivered");
    expect(renderOrderEmail("cancelled", { ...base, status: "cancelled" }).subject.toLowerCase()).toContain("cancel");
  });
});
