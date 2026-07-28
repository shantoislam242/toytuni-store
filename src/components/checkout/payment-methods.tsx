import { Banknote, CreditCard, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { paymentOptions, type PaymentIcon } from "@/lib/mock/checkout";

const paymentIcon: Record<PaymentIcon, LucideIcon> = {
  banknote: Banknote,
  bkash: Wallet,
  nagad: Wallet,
  card: CreditCard,
};

/**
 * Payment-method picker. When `onlineEnabled` is false (SSLCommerz creds not
 * configured), the online option is hidden and only Cash on Delivery is
 * offered — no "Coming Soon" placeholder, no dead option.
 */
export function PaymentMethods({
  value,
  onChange,
  onlineEnabled,
}: {
  value: string;
  onChange: (id: string) => void;
  onlineEnabled: boolean;
}) {
  const options = paymentOptions.filter((o) => o.id !== "online" || onlineEnabled);

  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">Payment Method</h2>
        {onlineEnabled ? (
          <Badge className="border-transparent bg-neem/15 text-neem-deep hover:bg-neem/15">
            Secure checkout
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = paymentIcon[option.icon];
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-neem bg-neem/5 ring-1 ring-neem"
                  : "border-cream-300 hover:border-neem-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-10 flex-none items-center justify-center rounded-xl transition-colors",
                  selected ? "bg-neem text-paper" : "bg-cream-100 text-neem-deep",
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{option.label}</p>
                <p className="text-xs text-ink-soft">{option.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-muted">
        {value === "online"
          ? "You'll be redirected to SSLCommerz to pay securely with bKash, Nagad, or card."
          : "Pay in cash when your order is delivered."}
      </p>
    </div>
  );
}
