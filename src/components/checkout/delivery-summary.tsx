import { Mail, MapPin, Pencil, Phone, PhoneCall, User } from "lucide-react";
import { mockCustomer } from "@/lib/mock/checkout";
import type { Address } from "@/lib/types";

/**
 * Logged-in delivery summary. Shows the customer's saved details instead of a
 * form, with a UI-only "Edit" button. When an `address` was chosen in the
 * address modal it takes precedence; otherwise it falls back to mock customer
 * data.
 */
export function DeliverySummary({
  address,
  onEdit,
}: {
  address?: Address | null;
  onEdit?: () => void;
}) {
  const rows = address
    ? [
        { icon: User, label: "Name", value: address.fullName },
        { icon: Phone, label: "Mobile Number", value: address.phone },
        ...(address.altPhone
          ? [
              {
                icon: PhoneCall,
                label: "Alternative Number",
                value: address.altPhone,
              },
            ]
          : []),
        ...(address.email
          ? [
              {
                icon: Mail,
                label: "Email",
                value: address.email,
              },
            ]
          : []),
        {
          icon: MapPin,
          label: "Delivery Address",
          value: [
            address.addressLine,
            address.area,
            address.district,
            address.division,
            address.landmark,
          ]
            .filter(Boolean)
            .join(", "),
        },
      ]
    : [
        { icon: User, label: "Name", value: mockCustomer.name },
        { icon: Phone, label: "Primary Mobile Number", value: mockCustomer.primaryPhone },
        { icon: PhoneCall, label: "Alternative Number", value: mockCustomer.altPhone },
        { icon: Mail, label: "Email", value: mockCustomer.email },
        { icon: MapPin, label: "Delivery Address", value: mockCustomer.address },
      ];

  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Delivery Information</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-neem hover:text-neem-deep"
        >
          <Pencil className="size-3.5" />
          Edit
        </button>
      </div>

      <dl className="mt-4 divide-y divide-cream-200">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 flex size-8 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
              <row.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
