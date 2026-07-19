import "server-only";
import { Resend } from "resend";

let cached: Resend | null | undefined;
export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new Resend(key) : null;
  return cached;
}
export const EMAIL_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
