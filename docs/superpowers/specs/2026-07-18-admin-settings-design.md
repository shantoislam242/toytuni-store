# toytuni-store — Phase 3 Slice: Admin Settings

**Date:** 2026-07-18
**Status:** Design approved, pending spec review
**Scope:** A `/admin/settings` page that makes the store's operational settings admin-editable, persisted in the existing `site_settings` table: **shipping fees** (inside/outside Dhaka) + **free-shipping threshold**, a **COD fee**, **contact info** (phone/WhatsApp/email/address), and **footer brand text** (tagline/description). The storefront checkout, order placement, footer, and contact page read these from the DB (fail-soft to the current code constants). First of five planned admin sections (Settings → Categories → Inventory → Customers → Blog).

## Background

Phase 3 Slices 1/2/3a/3b are merged and live. The admin sidebar shows Customers/Inventory/Blog/Settings as disabled "Soon" items. Store settings are currently hardcoded: shipping fees in `src/lib/shipping.ts` (`SHIPPING_ZONES`: inside Dhaka ৳80, outside ৳150), the free-shipping threshold in `src/components/checkout/checkout-view.tsx` (`FREE_SHIPPING_THRESHOLD = 2000`), brand text in `src/lib/config.ts` (`BRAND_TAGLINE`, `BRAND_DESCRIPTION`), and contact details in mock. There is no COD fee today. The `site_settings` table (`key text primary key, value jsonb`) exists but is unused. `createOrder` currently trusts the client-supplied `deliveryFee` (clamped ≥0) — a documented follow-up.

## Goals

- **`site_settings`-backed store settings** in one typed `general` row (jsonb): shipping (`insideDhakaFee`, `outsideDhakaFee`, `freeShippingThreshold`), `codFee`, contact (`phone`, `whatsapp`, `email`, `address`), brand (`tagline`, `description`).
- **`getSettings()`** — a server read (cookieless, cached, fail-soft to code defaults) returning a typed `Settings`.
- **Storefront reads settings:** checkout uses the shipping fees + threshold + COD fee; the footer + contact page use contact info + brand text.
- **`createOrder` becomes authoritative on delivery fee:** it recomputes the delivery fee server-side from settings + the order's district (no longer trusting the client value) and adds the COD fee for COD orders — closing the trust gap.
- **Admin Settings page + form** (`/admin/settings`) with grouped sections, writing via an `updateSettings` server action; enable the sidebar item.

## Non-goals (this slice)

- **Brand NAME + SEO metadata** stay code (`BRAND_NAME`, `SITE_URL` in `config.ts`) — they're build-time and deeply embedded (metadataBase, canonical, OG); moving them to runtime is invasive and out of scope. Only footer tagline/description move to DB.
- The other admin sections (Categories/Inventory/Customers/Blog) are separate later slices.
- No per-district rate table / real rate API (still the two-zone flat model, now DB-valued). No express-shipping fee in settings this slice (express stays a checkout delivery option).
- No multi-currency; BDT integers throughout.

## Locked decisions

- One `site_settings` row, `key = 'general'`, typed jsonb `value` (single read/write) — not a row-per-setting, not a new table.
- **Fail-soft:** a missing row or a thrown read error → the current code constants (site never breaks); logged.
- `createOrder` recomputes the delivery fee from settings + district server-side (authoritative); the client-sent fee is display-only.
- COD fee added to the order total only when `payment_method = 'cod'` (all orders today).

## Schema / seed

- No migration (table exists). `scripts/seed.ts` upserts the default `general` row from the current constants (idempotent): `{ shipping: {insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000}, codFee: 0, contact: {phone, whatsapp, email, address}, brand: {tagline: BRAND_TAGLINE, description: BRAND_DESCRIPTION} }`.

## Architecture

- **`src/lib/data/settings.ts`** (server-only): a `Settings` type + `DEFAULT_SETTINGS` (the current constants) + a pure `rowToSettings(value: unknown): Settings` (shape/validate the jsonb, filling any missing field from `DEFAULT_SETTINGS`) + `getSettings(): Promise<Settings>` — cookieless public client reads `site_settings` where `key='general'`; on error/missing → `DEFAULT_SETTINGS`; wrapped in `unstable_cache` tag `settings`, 1-hour revalidate.
- **Checkout:** the checkout page (server) calls `getSettings()` and passes `shippingZones`/`freeShippingThreshold`/`codFee` into `checkout-view` (client) as props; `checkout-view` uses those instead of the `FREE_SHIPPING_THRESHOLD` constant and `getShippingFee`. `src/lib/shipping.ts` keeps its zone SHAPE + district map, but the fee VALUES come from settings (a `getShippingFee(district, settings)` overload or the page computes it). COD fee shown as a line when `payment === 'cod'` and `codFee > 0`.
- **`createOrder`** (`src/lib/data/orders.ts`): call `getSettings()`; `deliveryFee = shippingFeeFor(district, settings)` (server-computed, replaces the trusted client value); add `codFee` to the total when COD. Persist as today (the `place_order` RPC is unchanged; total already includes fees).
- **Footer** (`src/components/layout/footer.tsx`) + **Contact page** (`src/app/contact/page.tsx`): read `getSettings()` for contact info + brand tagline/description (fall back to config/mock defaults).
- **Admin action** (`src/lib/admin/actions.ts`): `updateSettings(patch: Settings)` — admin re-check; validate (fees/threshold/codFee non-negative integers; contact strings; email/phone light validation); write the jsonb to `site_settings` (`upsert` on `key='general'`, service-role); `revalidateTag('settings')` + revalidate `/`, `/checkout`, `/contact`, `/admin/settings`.
- **Admin page** (`src/app/admin/settings/page.tsx`): server reads `getSettings()` (or a direct admin read) → renders `SettingsForm` (client) with grouped cards (Shipping, COD, Contact, Brand); on save calls `updateSettings`. **Sidebar:** remove `disabled` from the Settings item.

## Data flow — edit a shipping fee

1. Admin `/admin/settings` → edits "Outside Dhaka fee" → Save → `updateSettings` writes the jsonb → `revalidateTag('settings')`.
2. `getSettings()` returns the new value → checkout shows the new delivery fee; the footer/contact are unaffected.
3. A new order: `createOrder` recomputes the fee from settings + district server-side → the charged total uses the admin's fee, not a stale client value.

## Security / correctness

- `updateSettings` re-checks `getIsAdmin()` + service-role; validates every field (non-negative integer money; trimmed strings; reject absurd values).
- `createOrder`'s server-side fee recompute means a tampered client `deliveryFee` cannot change the charged total.
- `site_settings.value` jsonb absent from generated types → narrow-cast / `.overrideTypes()` (as established), not a regenerated types file.
- Fail-soft: `getSettings` returns defaults on any error → checkout/footer never break; logged.
- Settings are a tiny single row — safe to read on the checkout/footer/contact server renders; cached + tag-invalidated.

## Testing

- **Pure (TDD):** `rowToSettings` (valid blob → Settings; missing/partial fields → filled from defaults; garbage → defaults); `shippingFeeFor(district, settings)` (inside vs outside Dhaka).
- **Integration (drive it):** admin edits a shipping fee + COD fee + a contact field + tagline → Save persists to `site_settings`; checkout reflects the new delivery fee + COD line; a placed order's total uses the server-recomputed fee (not a tampered client value); footer + contact show the new contact/tagline; DB read failure → code defaults render; non-admin rejected.

## Open questions for review

- COD fee display at checkout: a separate "COD fee" line in the summary vs. folded into delivery. Proposal: a **separate line** (clearer), shown only when `> 0`.
- Contact `address`: single free-text line vs structured. Proposal: **single multi-line text** (simple; footer/contact render as-is).
