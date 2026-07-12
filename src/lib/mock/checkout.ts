/**
 * Mock data for the checkout page (UI only — no backend). Swap these for real
 * data/customer session when auth + orders are wired up later.
 */

export type PaymentIcon = "banknote" | "bkash" | "nagad" | "card";

/** Stand-in for the signed-in customer's saved details. */
export const mockCustomer = {
  name: "Ayesha Rahman",
  primaryPhone: "+880 1712-345678",
  altPhone: "+880 1898-765432",
  email: "ayesha.rahman@example.com",
  address: "House 42, Road 7, Block C, Banani, Dhaka 1213",
};

/** Bangladesh divisions for the guest address select. */
export const divisions = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh",
];

export type ShippingOption = {
  id: string;
  label: string;
  desc: string;
  price: number;
  eta: string;
};

export const shippingOptions: ShippingOption[] = [
  {
    id: "standard",
    label: "Standard Delivery",
    desc: "RedX · Pathao · Steadfast",
    price: 80,
    eta: "3–5 days",
  },
  {
    id: "express",
    label: "Express Delivery",
    desc: "Same-day / next-day dispatch",
    price: 120,
    eta: "1–2 days",
  },
  {
    id: "free",
    label: "Free Shipping",
    desc: "On orders over ৳2,000",
    price: 0,
    eta: "3–5 days",
  },
];

export type PaymentOption = {
  id: string;
  label: string;
  desc: string;
  icon: PaymentIcon;
};

export const paymentOptions: PaymentOption[] = [
  { id: "cod", label: "Cash on Delivery", desc: "Pay when it arrives", icon: "banknote" },
  { id: "bkash", label: "bKash", desc: "Mobile wallet", icon: "bkash" },
  { id: "nagad", label: "Nagad", desc: "Mobile wallet", icon: "nagad" },
  { id: "card", label: "Card Payment", desc: "Visa · Mastercard", icon: "card" },
];
