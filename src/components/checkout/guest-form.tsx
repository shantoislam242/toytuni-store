"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { AddressForm } from "@/components/checkout/address-form";
import type { AddressDraft, AddressErrors } from "@/lib/checkout/address-fields";

/**
 * Guest checkout details — the canonical `AddressForm` wired to the checkout
 * page's draft. The draft is pre-filled from the address the shopper confirmed
 * in the cart's delivery-address modal and stays editable here; the parent owns
 * it (controlled) so the confirmed address feeds order placement. A "Sign In"
 * shortcut sits above the form. (Order notes live in their own section on the
 * checkout page, so this form no longer duplicates them.)
 */
export function GuestForm({
  value,
  errors,
  showErrors,
  onChange,
  onSignIn,
}: {
  value: AddressDraft;
  errors: AddressErrors;
  showErrors: boolean;
  onChange: (patch: Partial<AddressDraft>) => void;
  onSignIn?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5 shadow-sm sm:p-6">
      {/* sign-in notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-100 px-4 py-3">
        <p className="text-sm text-ink-muted">Already have an account?</p>
        <Link
          href="/signin"
          onClick={onSignIn}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-neem-deep hover:underline"
        >
          <LogIn className="size-4" />
          Sign In
        </Link>
      </div>

      {/* contact + delivery details */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-ink">Contact &amp; Delivery</h3>
        <div className="mt-4">
          <AddressForm
            value={value}
            errors={errors}
            showErrors={showErrors}
            onChange={onChange}
          />
        </div>
      </section>
    </div>
  );
}
