"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { MapPin, Plus, Pencil, Trash2, Check, Star, X } from "lucide-react";
import { toast } from "sonner";
import { AddressForm } from "@/components/checkout/address-form";
import {
  emptyDraft,
  addressToDraft,
  isDraftValid,
  validateDraft,
  type AddressDraft,
} from "@/lib/checkout/address-fields";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/account/addresses";
import type { Address } from "@/lib/types";

type Editing = { mode: "create" } | { mode: "edit"; address: Address } | null;

/**
 * `/account/addresses` — the customer's saved-address book. Renders from the
 * server-fetched `addresses` prop and calls `router.refresh()` after each
 * mutation so the list re-reads the source of truth (no client-side cache to
 * drift). Add/edit happen in a dialog reusing the checkout `AddressForm`.
 */
export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runCard = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    setPendingId(id);
    startTransition(async () => {
      const res = await fn();
      setPendingId(null);
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Delivery</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Addresses</h1>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ mode: "create" })}
          className="inline-flex items-center gap-1.5 rounded-full bg-neem px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep"
        >
          <Plus className="size-4" /> Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <MapPin className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No saved addresses</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add an address to check out faster next time.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => {
            const busy = pendingId === a.id && isPending;
            return (
              <li
                key={a.id}
                className="flex flex-col rounded-2xl border border-cream-300 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{a.fullName}</span>
                    {a.isDefault ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neem/10 px-2 py-0.5 text-[11px] font-semibold text-neem-deep">
                        <Star className="size-3" /> Default
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-ink-muted">
                  <MapPin className="mt-0.5 size-3.5 flex-none text-ink-soft" />
                  <span>
                    {a.addressLine}, {a.area}, {a.district}, {a.division}
                    {a.landmark ? ` · ${a.landmark}` : ""}
                  </span>
                </p>
                <p className="mt-0.5 pl-5 text-sm text-ink-soft">{a.phone}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cream-200 pt-3 text-sm">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runCard(a.id, () => setDefaultAddress(a.id), "Default address updated.")
                      }
                      className="inline-flex items-center gap-1.5 font-medium text-neem-deep hover:text-neem disabled:opacity-50"
                    >
                      <Check className="size-4" /> Set default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing({ mode: "edit", address: a })}
                    className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-ink disabled:opacity-50"
                  >
                    <Pencil className="size-4" /> Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm("Delete this address?")) return;
                      runCard(a.id, () => deleteAddress(a.id), "Address deleted.");
                    }}
                    className="inline-flex items-center gap-1.5 font-medium text-ink-muted hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="size-4" /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddressDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function AddressDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: Editing;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = editing !== null;
  const isEdit = editing?.mode === "edit";
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft());
  const [makeDefault, setMakeDefault] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form each time the dialog opens.
  useEffect(() => {
    if (!editing) return;
    if (editing.mode === "edit") {
      setDraft(addressToDraft(editing.address));
      setMakeDefault(editing.address.isDefault);
    } else {
      setDraft(emptyDraft());
      setMakeDefault(false);
    }
    setShowErrors(false);
  }, [editing]);

  const errors = validateDraft(draft);

  const handleSave = async () => {
    if (!isDraftValid(draft)) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const res =
      editing?.mode === "edit"
        ? await updateAddress(editing.address.id, draft, makeDefault)
        : await createAddress(draft, makeDefault);
    setSaving(false);
    if (res.ok) {
      toast.success(isEdit ? "Address updated." : "Address saved.");
      onSaved();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Content className="address-modal fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cream-300 bg-paper text-sm text-ink shadow-2xl duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none">
          <div className="flex items-start justify-between gap-3 border-b border-cream-300 px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight text-ink">
                {isEdit ? "Edit address" : "Add a new address"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-ink-muted">
                Where should we deliver your orders?
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="-mr-1.5 -mt-1 flex size-10 flex-none items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4.5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin] sm:px-6">
            <AddressForm
              value={draft}
              errors={errors}
              showErrors={showErrors}
              onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            />
            <label className="mt-4 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="size-4 accent-neem"
              />
              <span className="text-sm text-ink-muted">Set as my default address</span>
            </label>
          </div>

          <div className="border-t border-cream-300 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neem px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
            >
              <Check className="size-4" />
              {saving ? "Saving…" : isEdit ? "Save changes" : "Save address"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
