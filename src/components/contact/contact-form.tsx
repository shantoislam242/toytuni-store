"use client";

import { useState } from "react";
import { Mail, MailCheck, Pencil, Send, ShieldCheck, Tag, User } from "lucide-react";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Please enter a valid email.";
    if (!message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    // UI-only: no network call. On valid input, show the confirmation.
    if (Object.keys(next).length === 0) setSubmitted(true);
  };

  const reset = () => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-cream-200 bg-paper px-6 py-16 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-neem/10 text-neem">
          <MailCheck className="size-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-ink">
          Thank you! We&apos;ll get back to you soon.
        </h2>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">
          Your message has been received. Our team typically replies within one business day.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-sm font-semibold text-neem-deep underline underline-offset-4 hover:text-neem"
        >
          Send another message
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
          <Mail className="size-5" />
        </span>
        <h2 className="font-display text-xl font-bold text-ink">Send Us a Message</h2>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="name"
            icon={<User className="size-4" />}
            placeholder="Your Name"
            value={name}
            onChange={setName}
            error={errors.name}
            autoComplete="name"
          />
          <Field
            id="email"
            icon={<Mail className="size-4" />}
            placeholder="Your Email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            type="email"
            autoComplete="email"
          />
        </div>

        <Field
          id="subject"
          icon={<Tag className="size-4" />}
          placeholder="Subject"
          value={subject}
          onChange={setSubject}
        />

        <div>
          <div className="flex items-start gap-2 rounded-xl border border-cream-300 bg-cream-50/60 px-3 py-2.5 transition-colors focus-within:border-neem">
            <Pencil className="mt-1 size-4 flex-none text-ink-soft" />
            <textarea
              id="message"
              rows={5}
              placeholder="Your Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Your Message"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
              className="w-full resize-y bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          {errors.message ? (
            <p id="message-error" className="mt-1 text-xs text-danger">
              {errors.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-colors hover:bg-neem-deep"
        >
          <Send className="size-4" />
          Send Message
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5 text-neem" />
          We&apos;ll get back to you as soon as possible.
        </p>
      </div>
    </form>
  );
}
