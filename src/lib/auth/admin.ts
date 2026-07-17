/** True iff the email is in the ADMIN_EMAILS allowlist (comma-separated,
 *  case-insensitive). The single source of admin truth. */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
