"use server";

/**
 * Server-side Cloudflare Turnstile verification. The signup form gets a token
 * from the Turnstile widget and hands it here BEFORE the account is created —
 * a bot without a valid token is rejected.
 *
 * Env-gated like the payment gateway: when `TURNSTILE_SECRET_KEY` is unset the
 * check is disabled (returns ok) so the build and signup keep working without
 * credentials. NOTE: this file is "use server" — it may export ONLY async
 * functions (a value export silently breaks the module's server actions).
 */
export async function verifyTurnstile(token: string): Promise<{ ok: boolean }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // disabled → don't block signup
  if (!token) return { ok: false };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return { ok: data.success === true };
  } catch (err) {
    console.error("Turnstile verify failed:", err);
    return { ok: false };
  }
}
