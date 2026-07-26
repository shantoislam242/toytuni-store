"use client";

import { ChevronDown } from "lucide-react";
import { divisionNames, districtsForDivision } from "@/lib/bd-locations";
import type { AddressDraft, AddressErrors } from "@/lib/checkout/address-fields";

// The address shape + validation live in the pure `address-fields` module so
// the server-side address actions can share them; re-exported here so existing
// importers of this component keep their import path.
export type { AddressDraft, AddressErrors } from "@/lib/checkout/address-fields";
export {
  PHONE_RE,
  normalizeBdPhone,
  emptyDraft,
  addressToDraft,
  draftToAddress,
  validateDraft,
  isDraftValid,
} from "@/lib/checkout/address-fields";

const fieldCls =
  "h-11 w-full rounded-lg border border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";
const phoneInputCls =
  "h-11 min-w-0 flex-1 rounded-r-lg border border-l-0 border-cream-300 bg-paper px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";
const phonePrefixCls =
  "flex h-11 shrink-0 items-center gap-1.5 rounded-l-lg border border-cream-300 bg-cream-100 px-2.5 text-sm font-medium text-ink";
const bdFlagCls =
  "relative h-3.5 w-4.5 overflow-hidden rounded-[2px] bg-[#006a4e] before:absolute before:left-[42%] before:top-1/2 before:size-2 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-[#f42a41]";
const errorFieldCls = "border-danger focus-visible:border-danger focus-visible:ring-danger/25";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : (
        <span className="ml-1 text-xs font-normal text-ink-soft">(optional)</span>
      )}
    </span>
  );
}

function ErrorText({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 text-xs text-danger">
      {msg}
    </p>
  );
}

/**
 * The BD-shaped address form. Controlled: the parent owns the draft + whether to
 * surface errors (so validation shows only after a submit attempt / on blur).
 * Picking a division resets the district. Journal-scoped styling — renders
 * inside the address modal's themed subtree.
 */
export function AddressForm({
  value,
  errors,
  showErrors,
  onChange,
}: {
  value: AddressDraft;
  errors: AddressErrors;
  showErrors: boolean;
  onChange: (patch: Partial<AddressDraft>) => void;
}) {
  const districts = districtsForDivision(value.division);
  const err = (k: keyof AddressDraft) => (showErrors ? errors[k] : undefined);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:gap-x-6">
      {/* full name */}
      <label className="block sm:col-span-2">
        <Label required>Full name</Label>
        <input
          type="text"
          value={value.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Recipient's full name"
          aria-invalid={Boolean(err("fullName"))}
          aria-describedby="err-fullName"
          className={`${fieldCls} ${err("fullName") ? errorFieldCls : ""}`}
        />
        <ErrorText id="err-fullName" msg={err("fullName")} />
      </label>

      {/* phone */}
      <label className="block sm:col-span-2 lg:col-span-1">
        <Label required>Phone</Label>
        <div className="flex">
          <span className={`${phonePrefixCls} ${err("phone") ? "border-danger" : ""}`}>
            <span className={bdFlagCls} aria-hidden />
            +880
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.phone}
            onChange={(e) =>
              onChange({
                phone: e.target.value.replace(/\D/g, "").slice(0, 11),
              })
            }
            placeholder="1*********"
            aria-invalid={Boolean(err("phone"))}
            aria-describedby="err-phone"
            className={`${phoneInputCls} ${err("phone") ? errorFieldCls : ""}`}
          />
        </div>
        <ErrorText id="err-phone" msg={err("phone")} />
      </label>

      {/* alternative phone (optional) */}
      <label className="block sm:col-span-2 lg:col-span-1">
        <Label>Alternative Number</Label>
        <div className="flex">
          <span className={`${phonePrefixCls} ${err("altPhone") ? "border-danger" : ""}`}>
            <span className={bdFlagCls} aria-hidden />
            +880
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.altPhone}
            onChange={(e) =>
              onChange({
                altPhone: e.target.value.replace(/\D/g, "").slice(0, 11),
              })
            }
            placeholder="A backup number for delivery."
            aria-invalid={Boolean(err("altPhone"))}
            aria-describedby="err-altPhone"
            className={`${phoneInputCls} ${err("altPhone") ? errorFieldCls : ""}`}
          />
        </div>
        <ErrorText id="err-altPhone" msg={err("altPhone")} />
      </label>

      {/* email (optional) */}
      <label className="block sm:col-span-2">
        <Label>Email Address</Label>
        <input
          type="email"
          inputMode="email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@example.com"
          aria-invalid={Boolean(err("email"))}
          aria-describedby="err-email"
          className={`${fieldCls} ${err("email") ? errorFieldCls : ""}`}
        />
        <ErrorText id="err-email" msg={err("email")} />
      </label>

      {/* division */}
      <label className="block">
        <Label required>Division</Label>
        <div className="relative">
          <select
            value={value.division}
            onChange={(e) => onChange({ division: e.target.value, district: "" })}
            aria-invalid={Boolean(err("division"))}
            aria-describedby="err-division"
            className={`${fieldCls} appearance-none pr-9 ${
              value.division ? "" : "text-ink-soft"
            } ${err("division") ? errorFieldCls : ""}`}
          >
            <option value="">Select division</option>
            {divisionNames.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        </div>
        <ErrorText id="err-division" msg={err("division")} />
      </label>

      {/* district */}
      <label className="block">
        <Label required>District</Label>
        <div className="relative">
          <select
            value={value.district}
            onChange={(e) => onChange({ district: e.target.value })}
            disabled={!value.division}
            aria-invalid={Boolean(err("district"))}
            aria-describedby="err-district"
            className={`${fieldCls} appearance-none pr-9 disabled:cursor-not-allowed disabled:opacity-60 ${
              value.district ? "" : "text-ink-soft"
            } ${err("district") ? errorFieldCls : ""}`}
          >
            <option value="">
              {value.division ? "Select district" : "Select division first"}
            </option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        </div>
        <ErrorText id="err-district" msg={err("district")} />
      </label>

      {/* area / thana */}
      <label className="block sm:col-span-2">
        <Label required>Area / Thana</Label>
        <input
          type="text"
          value={value.area}
          onChange={(e) => onChange({ area: e.target.value })}
          placeholder="e.g. Banani, Gulshan-2"
          aria-invalid={Boolean(err("area"))}
          aria-describedby="err-area"
          className={`${fieldCls} ${err("area") ? errorFieldCls : ""}`}
        />
        <ErrorText id="err-area" msg={err("area")} />
      </label>

      {/* full address line */}
      <label className="block sm:col-span-2">
        <Label required>Full address line</Label>
        <input
          type="text"
          value={value.addressLine}
          onChange={(e) => onChange({ addressLine: e.target.value })}
          placeholder="House / Road / Block, apartment, etc."
          aria-invalid={Boolean(err("addressLine"))}
          aria-describedby="err-addressLine"
          className={`${fieldCls} ${err("addressLine") ? errorFieldCls : ""}`}
        />
        <ErrorText id="err-addressLine" msg={err("addressLine")} />
      </label>

      {/* landmark (optional) */}
      <label className="block sm:col-span-2">
        <Label>Landmark</Label>
        <input
          type="text"
          value={value.landmark}
          onChange={(e) => onChange({ landmark: e.target.value })}
          placeholder="Nearby landmark to help the courier"
          className={fieldCls}
        />
      </label>
    </div>
  );
}
