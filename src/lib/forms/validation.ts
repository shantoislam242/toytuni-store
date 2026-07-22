import { isValidBdMobile } from "@/lib/auth/bd-phone";

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function req(v: string, label: string, max: number): { ok: true; value: string } | Err {
  const t = v.trim();
  if (t === "") return { ok: false, error: `Please enter ${label}.` };
  if (t.length > max) return { ok: false, error: `${label} is too long (max ${max}).` };
  return { ok: true, value: t };
}
function opt(v: string | undefined, label: string, max: number): { ok: true; value: string | null } | Err {
  const t = (v ?? "").trim();
  if (t === "") return { ok: true, value: null };
  if (t.length > max) return { ok: false, error: `${label} is too long (max ${max}).` };
  return { ok: true, value: t };
}

export function validateContact(input: { name: string; email: string; subject?: string; message: string }):
  Ok<{ name: string; email: string; subject: string | null; message: string }> | Err {
  const name = req(input.name, "your name", 120); if (!name.ok) return name;
  const email = input.email.trim();
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please enter a valid email address." };
  const subject = opt(input.subject, "Subject", 200); if (!subject.ok) return subject;
  const message = req(input.message, "your message", 3000); if (!message.ok) return message;
  return { ok: true, value: { name: name.value, email, subject: subject.value, message: message.value } };
}

export function validateBulk(input: {
  business: string; person: string; email: string; phone: string;
  program?: string; quantity?: string; message: string;
}): Ok<{ business: string; person: string; email: string; phone: string; program: string | null; quantity: string | null; message: string }> | Err {
  const business = req(input.business, "your business name", 200); if (!business.ok) return business;
  const person = req(input.person, "a contact person", 120); if (!person.ok) return person;
  const email = input.email.trim();
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "Please enter a valid email address." };
  if (!isValidBdMobile(input.phone)) return { ok: false, error: "Please enter a valid Bangladeshi phone number." };
  const program = opt(input.program, "Program", 200); if (!program.ok) return program;
  const quantity = opt(input.quantity, "Quantity", 200); if (!quantity.ok) return quantity;
  const message = req(input.message, "your message", 3000); if (!message.ok) return message;
  return { ok: true, value: {
    business: business.value, person: person.value, email, phone: input.phone.trim(),
    program: program.value, quantity: quantity.value, message: message.value,
  } };
}

export function validateNewsletterEmail(email: string): Ok<string> | Err {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e === "" || e.length > 200) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  return { ok: true, value: e };
}
