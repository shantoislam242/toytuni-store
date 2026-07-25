/** Minimum length for a customer-set password (matches the sign-up rule). */
export const MIN_PASSWORD_LEN = 8;

/**
 * Validate a password-change form. Returns a human-readable error, or `null`
 * when the pair is acceptable. Pure — shared by the Security form and its test.
 */
export function validatePasswordChange(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LEN) {
    return `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
  }
  if (password !== confirm) return "Passwords do not match.";
  return null;
}
