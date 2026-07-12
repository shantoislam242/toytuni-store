import Link from "next/link";
import { LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { divisions } from "@/lib/mock/checkout";

function Field({
  label,
  htmlFor,
  optional,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? <span className="ml-1 text-xs text-ink-soft">(optional)</span> : null}
      </label>
      {children}
    </div>
  );
}

const inputCls = "h-11 bg-paper";
const phonePrefixCls =
  "flex h-11 shrink-0 items-center gap-1.5 rounded-l-md border border-input bg-cream-100 px-2.5 text-sm font-medium text-ink";
const phoneInputCls = "h-11 min-w-0 flex-1 rounded-l-none bg-paper";
const bdFlagCls =
  "relative h-3.5 w-4.5 overflow-hidden rounded-[2px] bg-[#006a4e] before:absolute before:left-[42%] before:top-1/2 before:size-2 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-[#f42a41]";

function PhoneField({
  id,
  placeholder = "1*********",
  required,
}: {
  id: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex">
      <span className={phonePrefixCls}>
        <span className={bdFlagCls} aria-hidden />
        +880
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        pattern="0?1[0-9]{9}"
        maxLength={11}
        placeholder={placeholder}
        required={required}
        onChange={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 11);
        }}
        className={phoneInputCls}
      />
    </div>
  );
}

/**
 * Guest checkout form: customer information, delivery address, and order notes.
 * UI only — inputs are uncontrolled and nothing is submitted or validated yet.
 * A "Sign In" notice sits above the form (link is UI only).
 */
export function GuestForm({ onSignIn }: { onSignIn?: () => void }) {
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

      {/* contact information */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-ink">Contact Information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:gap-x-6">
          <Field label="Full Name" htmlFor="full-name">
            <Input id="full-name" placeholder="Your full name" className={inputCls} />
          </Field>
          <Field label="Email Address" htmlFor="email">
            <Input
              id="email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>
          <Field
            label="Primary Mobile Number"
            htmlFor="primary-mobile"
            required
            className="sm:col-span-2 lg:col-span-1"
          >
            <PhoneField id="primary-mobile" required />
          </Field>
          <Field
            label="Alternative Number"
            htmlFor="alt-mobile"
            optional
            className="sm:col-span-2 lg:col-span-1"
          >
            <PhoneField id="alt-mobile" placeholder="A backup number for delivery." />
          </Field>
        </div>
      </section>

      {/* delivery address */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-ink">Delivery Address</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Division" htmlFor="division">
            <Select>
              <SelectTrigger id="division" className="h-11 w-full bg-paper">
                <SelectValue placeholder="Select division" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="District" htmlFor="district">
            <Input id="district" placeholder="e.g. Dhaka" className={inputCls} />
          </Field>
          <Field label="Area" htmlFor="area">
            <Input id="area" placeholder="e.g. Banani" className={inputCls} />
          </Field>
          <Field label="Postal Code" htmlFor="postal" optional>
            <Input id="postal" inputMode="numeric" placeholder="1213" className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Full Address" htmlFor="address">
              <Input
                id="address"
                placeholder="House / Road / Block, landmark"
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* additional */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-ink">Additional</h3>
        <div className="mt-4">
          <Field label="Order Notes" htmlFor="notes" optional>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any delivery instructions or gift message…"
              className="w-full rounded-lg border border-input bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
        </div>
      </section>
    </div>
  );
}
