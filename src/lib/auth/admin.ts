/** True iff the email is in the ADMIN_EMAILS allowlist (comma-separated,
 *  case-insensitive). The single source of admin truth for both server and
 *  client: on the server `ADMIN_EMAILS` is set; in client bundles that var is
 *  stripped, so this falls back to `NEXT_PUBLIC_ADMIN_EMAILS` (the same list,
 *  exposed there since an admin allowlist is not a secret — the server check
 *  via `getIsAdmin()` remains authoritative). */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "";
  const list = raw
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
