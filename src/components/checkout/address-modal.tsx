"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Check, LogIn, MapPin, Plus, Truck, X } from "lucide-react";
import {
  AddressForm,
  emptyDraft,
  isDraftValid,
  normalizeBdPhone,
  validateDraft,
  type AddressDraft,
} from "@/components/checkout/address-form";
import { getShippingFee, zoneForDistrict } from "@/lib/shipping";
import { formatTk } from "@/lib/format";
import type { Address } from "@/lib/types";

const NEW = "__new__";

/**
 * Address-selection modal shown after the customer agrees to T&C and clicks
 * "Proceed to Checkout". Three states, driven by `isLoggedIn` + the saved list:
 *   1. logged-in WITH saved addresses → radio-style list + "new address" option
 *   2. logged-in WITHOUT saved addresses → the form + "save to account"
 *   3. guest → the form + a non-blocking "create an account" nudge
 * Picking a saved address or a district recomputes the delivery fee and the
 * total live, before confirm. Journal-themed (`.address-modal` scope). Esc /
 * backdrop close + focus trap come from radix; reduced motion is respected.
 * Frontend only — save/create handlers are stubbed; the confirmed address is
 * handed back via `onConfirm`.
 */
export function AddressModal({
  open,
  onOpenChange,
  isLoggedIn,
  savedAddresses,
  subtotal,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn: boolean;
  savedAddresses: Address[];
  subtotal: number;
  onConfirm: (address: Address) => void;
}) {
  const hasSaved = isLoggedIn && savedAddresses.length > 0;
  const defaultId =
    savedAddresses.find((a) => a.isDefault)?.id ?? savedAddresses[0]?.id ?? NEW;

  const [choice, setChoice] = useState<string>(hasSaved ? defaultId : NEW);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft());
  const [showErrors, setShowErrors] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(false);

  // Reset to a clean state every time the modal opens.
  useEffect(() => {
    if (!open) return;
    setChoice(hasSaved ? defaultId : NEW);
    setDraft(emptyDraft());
    setShowErrors(false);
    setSaveToAccount(false);
  }, [open, hasSaved, defaultId]);

  const showForm = !hasSaved || choice === NEW;
  const selectedSaved =
    !showForm && hasSaved ? savedAddresses.find((a) => a.id === choice) : undefined;

  // Live fee: from the picked saved address, or the district typed in the form.
  const activeDistrict = showForm ? draft.district : selectedSaved?.district ?? "";
  const zone = activeDistrict ? zoneForDistrict(activeDistrict) : null;
  const fee = activeDistrict ? getShippingFee(activeDistrict) : null;
  const total = subtotal + (fee ?? 0);

  const canConfirm = showForm || Boolean(selectedSaved);
  const errors = validateDraft(draft);

  const patchDraft = (patch: Partial<AddressDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const handleConfirm = () => {
    if (selectedSaved) {
      onConfirm(selectedSaved);
      return;
    }
    if (!isDraftValid(draft)) {
      setShowErrors(true);
      return;
    }
    const address: Address = {
      id: `addr-${Date.now()}`,
      fullName: draft.fullName.trim(),
      phone: normalizeBdPhone(draft.phone),
      altPhone: draft.altPhone.trim() ? normalizeBdPhone(draft.altPhone) : undefined,
      email: draft.email.trim() || undefined,
      division: draft.division,
      district: draft.district,
      area: draft.area.trim(),
      addressLine: draft.addressLine.trim(),
      landmark: draft.landmark.trim() || undefined,
      isDefault: false,
    };
    // Stub — persist to the customer's account when a real API exists.
    if (isLoggedIn && saveToAccount) {
      // saveAddressToAccount(address)
    }
    onConfirm(address);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Content className="address-modal fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cream-300 bg-paper text-sm text-ink shadow-2xl duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none">
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-cream-300 px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight text-ink">
                Delivery address
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-ink-muted">
                {hasSaved
                  ? "Choose where to deliver, or add a new address."
                  : "Where should we deliver your order?"}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="-mr-1.5 -mt-1 flex size-9 flex-none items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4.5" />
            </Dialog.Close>
          </div>

          {/* scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] sm:px-6">
            {/* guest: sign-in shortcut */}
            {!isLoggedIn ? (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream-100 px-4 py-3">
                <p className="text-sm text-ink-muted">Already have an account?</p>
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-neem-deep hover:underline"
                >
                  <LogIn className="size-4" />
                  Sign In
                </Link>
              </div>
            ) : null}

            {/* state 1: saved-address list */}
            {hasSaved ? (
              <fieldset className="space-y-3">
                <legend className="sr-only">Saved addresses</legend>
                {savedAddresses.map((a) => (
                  <SavedAddressCard
                    key={a.id}
                    address={a}
                    selected={choice === a.id}
                    onSelect={() => setChoice(a.id)}
                  />
                ))}

                {/* new-address option */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                    choice === NEW
                      ? "border-neem bg-neem/5 ring-1 ring-neem"
                      : "border-cream-300 hover:border-neem-soft"
                  }`}
                >
                  <input
                    type="radio"
                    name="address-choice"
                    checked={choice === NEW}
                    onChange={() => setChoice(NEW)}
                    className="size-4 accent-neem"
                  />
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <Plus className="size-4 text-neem-deep" />
                    Deliver to a new address
                  </span>
                </label>
              </fieldset>
            ) : null}

            {/* form (states 2 & 3, or revealed by "new address" in state 1) */}
            {showForm ? (
              <div className={hasSaved ? "mt-5 border-t border-cream-300 pt-5" : ""}>
                <AddressForm
                  value={draft}
                  errors={errors}
                  showErrors={showErrors}
                  onChange={patchDraft}
                />

                {/* logged-in: save to account */}
                {isLoggedIn ? (
                  <label className="mt-4 flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={saveToAccount}
                      onChange={(e) => setSaveToAccount(e.target.checked)}
                      className="size-4 accent-neem"
                    />
                    <span className="text-sm text-ink-muted">
                      Save this address to my account
                    </span>
                  </label>
                ) : (
                  // guest: non-blocking create-account nudge
                  <p className="mt-4 rounded-lg bg-cream-100 px-4 py-3 text-sm text-ink-muted">
                    <button
                      type="button"
                      onClick={() => {
                        // Stub — route to sign-up when auth exists.
                      }}
                      className="font-semibold text-neem-deep underline-offset-2 hover:underline"
                    >
                      Create an account
                    </button>{" "}
                    to save your details for next time.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {/* footer: live fee + total + confirm */}
          <div className="border-t border-cream-300 px-5 py-4 sm:px-6">
            <dl className="space-y-1.5">
              <div className="flex items-center justify-between text-ink-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatTk(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <Truck className="size-4 text-neem-deep" />
                  {zone ? `Delivery (${zone.label})` : "Delivery"}
                </dt>
                <dd className="tabular-nums font-medium text-ink">
                  {fee === null ? (
                    <span className="text-ink-soft">Select an address</span>
                  ) : (
                    formatTk(fee)
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-cream-300 pt-2 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatTk(total)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-neem px-5 py-3 text-sm font-semibold text-paper transition-all duration-200 hover:-translate-y-0.5 hover:bg-neem-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neem/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 motion-reduce:hover:translate-y-0"
            >
              <Check className="size-4" />
              Confirm &amp; Continue
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SavedAddressCard({
  address,
  selected,
  onSelect,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
        selected
          ? "border-neem bg-neem/5 ring-1 ring-neem"
          : "border-cream-300 hover:border-neem-soft"
      }`}
    >
      <input
        type="radio"
        name="address-choice"
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 size-4 flex-none accent-neem"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{address.fullName}</span>
          {address.isDefault ? (
            <span className="rounded-full bg-neem/10 px-2 py-0.5 text-[11px] font-semibold text-neem-deep">
              Default
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-sm leading-6 text-ink-muted">
          <MapPin className="mt-0.5 size-3.5 flex-none text-ink-soft" />
          <span>
            {address.addressLine}, {address.area}, {address.district}, {address.division}
            {address.landmark ? ` · ${address.landmark}` : ""}
          </span>
        </p>
        <p className="mt-0.5 pl-5 text-sm text-ink-soft">{address.phone}</p>
      </div>
    </label>
  );
}
