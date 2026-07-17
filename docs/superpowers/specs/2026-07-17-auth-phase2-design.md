# toytuni-store — Backend Phase 2: Auth (Supabase, Google + Email)

**Date:** 2026-07-17
**Status:** Design approved, pending spec review
**Scope:** Phase 2 of the backend effort. Authentication only — the prerequisite for the Phase 3 admin UI.

## Background

Phase 1 (data layer) is merged and live: the storefront reads price/stock/pre-order from Supabase and places COD orders. There is NO real auth yet — `isLoggedIn` is a mock boolean scattered across cart/checkout/address components, the `/signin` page is UI-only (it has both an email/password multi-step form AND a Google button, neither wired), and the `/account` page is a placeholder "sign-in gate". The `customers` table already has a nullable `auth_user_id` column anticipating this.

## Goals

- Real authentication via **Supabase Auth**, with **two methods**: email + password, and **Google OAuth**. A user may create an account / sign in with either.
- **Admin access** gated by an **email allowlist** (`ADMIN_EMAILS` env var). Whichever method an admin signs in with, they are an admin iff their email is in the allowlist.
- Protect `/admin/*` routes (redirect: not-signed-in → `/signin`; signed-in-but-not-admin → home). A minimal placeholder `/admin` page proves the gate (real admin UI is Phase 3).
- Replace every `isLoggedIn` mock with the real session.
- **Customer accounts:** on first sign-in, link a `customers` row (`auth_user_id` + name/email). The `/account` page shows the signed-in customer and their order history.

## Non-goals (Phase 2)

- No admin UI beyond a protected placeholder (Phase 3).
- No password reset / "forgot password" flow (deferred; easy to add later).
- No email/password account-linking-to-existing-Google-account merge logic (a user who signs up both ways gets two identities unless Supabase links by email — accept Supabase's default behavior).
- No role system beyond admin-vs-not (the allowlist). Staff/permissions is a later phase.

## Locked decisions

- **Provider:** Supabase Auth (already have Supabase; least setup). Session via `@supabase/ssr` (clients already exist from Phase 1).
- **Methods:** email+password AND Google OAuth, both wired into the existing `/signin` UI.
- **Admin identity:** `ADMIN_EMAILS` env var (comma-separated, lowercased match). Pure `isAdmin(email)` helper.
- **Email confirmation:** use Supabase's default (a confirmation email on email/password sign-up). The auth callback route handles both the OAuth code exchange and the email confirmation link.
- **Order history:** read server-side with the service-role client, scoped to the signed-in user's `customer_id` — no new RLS policy needed (the session is the authorization).

## Non-standard Next.js

Auth touches Next.js APIs that this repo's build treats specially. Per `AGENTS.md`, before writing middleware, the auth callback route handler, or cookie/session code, READ the relevant guide in `node_modules/next/dist/docs/` — notably `01-app/02-guides/authentication.md` and the middleware / route-handler / `cookies()` references. Do not write these APIs from memory.

## Architecture

- **Middleware (`middleware.ts`):** on every request, refresh the Supabase session cookie (required by `@supabase/ssr`), and guard `/admin/*` (redirect per the rules above). Uses a request-scoped Supabase client reading `ADMIN_EMAILS`.
- **Auth callback (`src/app/auth/callback/route.ts`):** exchanges the OAuth/confirmation `code` for a session, then redirects to `next` (or home / `/account`).
- **Sign-in:** wire the `/signin` page — the Google button → `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: <callback> } })`; the email/password form → `signUp` / `signInWithPassword`. Wire a **sign-out** action (header + account).
- **Session access:**
  - Server: `getSessionUser()` → the current Supabase user (or null), and `getIsAdmin()`.
  - Client: an `AuthProvider` + `useAuth()` exposing `{ user, isAdmin, loading }`, subscribed to `onAuthStateChange`. Every `isLoggedIn` mock is replaced by `useAuth()` (client) or the server helper.
- **Admin allowlist:** `src/lib/auth/admin.ts` — `isAdmin(email: string | null | undefined): boolean` against `ADMIN_EMAILS`. Pure, TDD'd. Used by middleware and `getIsAdmin()`.
- **Customer link:** on sign-in (in the callback or a post-login server action), upsert the `customers` row keyed by email/`auth_user_id` — set `auth_user_id`, `name`, `email` from the Supabase user. Uses the service-role client (server-side).
- **Account page:** server component — if signed in, show name/email + order history (orders where `customer_id` = the linked customer, via service-role client); else the existing sign-in gate.
- **Checkout/cart:** replace `isLoggedIn` mocks with the real session; a signed-in user's name/email/phone can prefill the order (guest checkout still works unchanged).

## Manual setup (the user — like Phase 1's migrations)

1. **Google OAuth:** create OAuth credentials in Google Cloud Console (authorized redirect URI = the Supabase auth callback, `https://qbvymmzraatzcewiztve.supabase.co/auth/v1/callback`); enable the Google provider in Supabase → Authentication → Providers and paste the client id/secret.
2. **Email provider:** ensure Supabase → Authentication → Providers → Email is enabled (default on).
3. **Redirect URLs:** in Supabase → Authentication → URL Configuration, add the site URL(s) and `…/auth/callback` for localhost + production.
4. **`ADMIN_EMAILS`** env var (local `.env.local` + Vercel) = the admin email(s), comma-separated.

## Testing

- **Pure logic (TDD):** `isAdmin(email)` — allowlist membership, case-insensitivity, null/empty, whitespace, multiple emails.
- **Integration (drive the app):** Google sign-in round-trip; email sign-up + confirm + sign-in; `/admin` gate (anonymous → `/signin`, non-admin → home, admin → placeholder); `/account` shows the signed-in user + their orders; sign-out clears the session; the header reflects auth state.

## Open questions for review

None blocking. Password reset and identity-merge are explicitly deferred.
