"use client";

import { useState } from "react";
import {
  Boxes,
  Building2,
  Mail,
  PackageCheck,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Tag,
  User,
} from "lucide-react";
import { bulkTiers } from "@/lib/mock/bulk";

type Errors = Partial<Record<"business" | "person" | "email" | "program", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Program options: the three tier names plus a generic "Other".
const PROGRAM_OPTIONS = [...bulkTiers.map((t) => t.titleBn), "Other"];

/** A single labelled input with a leading icon and an optional error line. */
function Field({
  id,
  icon,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
}: {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2.5 transition-colors focus-within:border-neem">
        <span className="flex-none text-ink-soft">{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * UI-only B2B inquiry form for the /bulk page. Validates business name, contact
 * person, email, and program, then shows a success state. No network request —
 * mirrors the Contact page form.
 */
export function BulkForm() {
  const [business, setBusiness] = useState("");
  const [person, setPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState("");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!business.trim()) next.business = "Please enter your business name.";
    if (!person.trim()) next.person = "Please enter a contact person.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Please enter a valid email.";
    if (!program) next.program = "Please select a program.";
    setErrors(next);
    // UI-only: no network call. On valid input, show the confirmation.
    if (Object.keys(next).length === 0) setSubmitted(true);
  };

  const reset = () => {
    setBusiness("");
    setPerson("");
    setEmail("");
    setPhone("");
    setProgram("");
    setQuantity("");
    setMessage("");
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-cream-200 bg-paper px-6 py-16 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-neem/10 text-neem">
          <PackageCheck className="size-7" />
        </span>
        <h3 className="mt-4 font-display text-xl font-bold text-ink">
          Thanks — your inquiry is in.
        </h3>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">
          Our wholesale team will get back to you within one business day.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-sm font-semibold text-neem-deep underline underline-offset-4 hover:text-neem"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="relative overflow-hidden rounded-2xl border border-cream-200 bg-paper p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-neem/10 text-neem">
          <Building2 className="size-5" />
        </span>
        <h3 className="font-display text-xl font-bold text-ink">Request a quote</h3>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="business"
            icon={<Building2 className="size-4" />}
            placeholder="Business / organization name"
            value={business}
            onChange={setBusiness}
            error={errors.business}
            autoComplete="organization"
          />
          <Field
            id="person"
            icon={<User className="size-4" />}
            placeholder="Contact person"
            value={person}
            onChange={setPerson}
            error={errors.person}
            autoComplete="name"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="email"
            icon={<Mail className="size-4" />}
            placeholder="Email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            type="email"
            autoComplete="email"
          />
          <Field
            id="phone"
            icon={<Phone className="size-4" />}
            placeholder="Phone (optional)"
            value={phone}
            onChange={setPhone}
            type="tel"
            autoComplete="tel"
          />
        </div>

        {/* program select — styled to match the Field shell */}
        <div>
          <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2.5 transition-colors focus-within:border-neem">
            <Tag className="size-4 flex-none text-ink-soft" />
            <select
              id="program"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              aria-label="Program"
              aria-invalid={!!errors.program}
              aria-describedby={errors.program ? "program-error" : undefined}
              className={`w-full bg-transparent text-sm outline-none ${
                program ? "text-ink" : "text-ink-soft"
              }`}
            >
              <option value="" disabled>
                Select a program
              </option>
              {PROGRAM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {errors.program ? (
            <p id="program-error" className="mt-1 text-xs text-danger">
              {errors.program}
            </p>
          ) : null}
        </div>

        <Field
          id="quantity"
          icon={<Boxes className="size-4" />}
          placeholder="Estimated quantity (optional)"
          value={quantity}
          onChange={setQuantity}
        />

        <div>
          <div className="flex items-start gap-2 rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2.5 transition-colors focus-within:border-neem">
            <Pencil className="mt-1 size-4 flex-none text-ink-soft" />
            <textarea
              id="message"
              rows={4}
              placeholder="Tell us about your needs (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Message"
              className="w-full resize-y bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-colors hover:bg-neem-deep"
        >
          <Send className="size-4" />
          Send inquiry
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5 text-neem" />
          We usually reply to wholesale inquiries within one business day.
        </p>
      </div>
    </form>
  );
}
