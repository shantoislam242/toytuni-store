import "server-only";

/**
 * Admin absolute-session cap. Consumer sessions stay long-lived (Supabase's
 * default long refresh cookie — fine for an e-commerce storefront), but an
 * ADMIN must re-authenticate after this window regardless, so a stolen or
 * forgotten long-lived session can't stay privileged indefinitely.
 *
 * Enforced in two places: `getAdminRole()` treats an over-age session as
 * non-admin (covers server actions + route handlers), and the admin layout
 * bounces such a session through `/auth/admin-timeout` (sign out + re-login).
 *
 * Measured from `last_sign_in_at`, which only advances on a real sign-in — NOT
 * on silent token refresh — so this is a true "re-login every N hours" cap.
 */
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

/** True when an admin's session is older than the cap (so admin access must
 *  be re-established). Missing `last_sign_in_at` → not expired (fail-open on an
 *  unknown timestamp rather than locking a legitimate admin out). */
export function isAdminSessionExpired(lastSignInAt: string | null | undefined): boolean {
  if (!lastSignInAt) return false;
  const signedInMs = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signedInMs)) return false;
  return Date.now() - signedInMs > ADMIN_SESSION_MAX_AGE_MS;
}
