# Admin Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/admin/settings` page making store settings (shipping fees + free-ship threshold, COD fee, contact info, footer brand text) admin-editable via the `site_settings` table, with the storefront checkout / order placement / footer / contact page reading them (fail-soft to code defaults), and `createOrder` recomputing the delivery fee server-side.

**Architecture:** Pure `Settings` shape + `rowToSettings` + `DEFAULT_SETTINGS` (settings-shape.ts) feed a cached, fail-soft `getSettings()` (settings.ts). An `updateSettings` action + admin form write the single `general` jsonb row. Checkout/createOrder/footer/contact consume settings; `createOrder` becomes authoritative on the delivery fee.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-admin-settings-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag` / `unstable_cache`. Middleware is `src/proxy.ts`.
- **No migration** — `site_settings (key text pk, value jsonb)` already exists. `site_settings.value` is absent from generated `database.types.ts` → narrow-cast / `.overrideTypes()` (as established), NOT a regenerated types file.
- **Fail-soft:** `getSettings` returns `DEFAULT_SETTINGS` on any thrown error or a missing row — checkout/footer/contact never break; logged.
- **`createOrder` authoritative:** it recomputes `deliveryFee = shippingFeeFor(district, settings)` server-side and adds `codFee` for COD; the client-sent `deliveryFee` becomes display-only (do NOT trust it for the charged total).
- **Brand NAME + SEO stay code** (`BRAND_NAME`, `SITE_URL` in `config.ts`) — only footer tagline/description move to DB.
- Whole BDT integers; `formatTk`. Admin writes re-check `getIsAdmin()` + service-role. Toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## Manual step

No migration. After Task 2, run `npm run db:seed` (controller can run it) to insert the default `general` row before the Task 3/4/5 live verification. Unit tests + build don't require it (fail-soft → defaults).

## File structure

- Create `src/lib/data/settings-shape.ts` (+ `.test.ts`) — pure `Settings`/`DEFAULT_SETTINGS`/`rowToSettings`.
- Modify `src/lib/shipping.ts` (+ `src/lib/shipping.test.ts`) — pure `shippingFeeFor`.
- Create `src/lib/data/settings.ts` — server `getSettings` (cached, fail-soft).
- Modify `scripts/seed.ts` — upsert the default `general` row.
- Modify `src/lib/admin/actions.ts` — `updateSettings`.
- Create `src/app/admin/settings/page.tsx`, `src/components/admin/settings-form.tsx`; modify `src/components/admin/admin-sidebar.tsx`.
- Modify `src/app/checkout/page.tsx`, `src/components/checkout/checkout-view.tsx`, `src/lib/data/orders.ts`.
- Modify `src/components/layout/footer.tsx`, `src/app/contact/page.tsx`.

---

## Task 1: `Settings` shape + `rowToSettings` + `shippingFeeFor` (TDD)

**Files:** Create `src/lib/data/settings-shape.ts`, `src/lib/data/settings-shape.test.ts`. Modify `src/lib/shipping.ts`; create `src/lib/shipping.test.ts`.

**Interfaces:**
- Produces: `Settings` type; `DEFAULT_SETTINGS: Settings`; `rowToSettings(value: unknown): Settings` (pure, fills missing/invalid from defaults); `shippingFeeFor(district, {insideDhakaFee, outsideDhakaFee}): number`.

- [ ] **Step 1 — failing test** `src/lib/data/settings-shape.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rowToSettings, DEFAULT_SETTINGS } from "./settings-shape";

describe("rowToSettings", () => {
  it("returns defaults for null/garbage", () => {
    expect(rowToSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(rowToSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(rowToSettings({ shipping: 5 })).toEqual(DEFAULT_SETTINGS);
  });

  it("merges valid fields over defaults, filling the rest", () => {
    const s = rowToSettings({
      shipping: { insideDhakaFee: 100, outsideDhakaFee: 200, freeShippingThreshold: 3000 },
      codFee: 30,
      contact: { phone: "01711", whatsapp: "wa", email: "a@b.com", address: "Dhaka" },
      brand: { tagline: "T", description: "D" },
    });
    expect(s.shipping.insideDhakaFee).toBe(100);
    expect(s.codFee).toBe(30);
    expect(s.contact.email).toBe("a@b.com");
    expect(s.brand.tagline).toBe("T");
  });

  it("fills partial/invalid subfields from defaults", () => {
    const s = rowToSettings({ shipping: { insideDhakaFee: -5, outsideDhakaFee: 200 }, codFee: "x" });
    expect(s.shipping.insideDhakaFee).toBe(DEFAULT_SETTINGS.shipping.insideDhakaFee); // -5 invalid → default
    expect(s.shipping.outsideDhakaFee).toBe(200);
    expect(s.shipping.freeShippingThreshold).toBe(DEFAULT_SETTINGS.shipping.freeShippingThreshold);
    expect(s.codFee).toBe(DEFAULT_SETTINGS.codFee); // "x" invalid → default
  });
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/data/settings-shape.test.ts`

- [ ] **Step 3 — implement `src/lib/data/settings-shape.ts`:**

```ts
import { BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/config";

export type Settings = {
  shipping: { insideDhakaFee: number; outsideDhakaFee: number; freeShippingThreshold: number };
  codFee: number;
  contact: { phone: string; whatsapp: string; email: string; address: string };
  brand: { tagline: string; description: string };
};

/** Current hardcoded values become the defaults + fail-soft fallback. */
export const DEFAULT_SETTINGS: Settings = {
  shipping: { insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000 },
  codFee: 0,
  contact: {
    phone: "+880 1234-567890",
    whatsapp: "+880 1234-567890",
    email: "hello@toytuni.com",
    address: "Dhaka, Bangladesh",
  },
  brand: { tagline: BRAND_TAGLINE, description: BRAND_DESCRIPTION },
};

const nnInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;
const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

/** Shape any stored jsonb into a full Settings, filling every missing/invalid
 *  field from DEFAULT_SETTINGS. Pure — never throws. */
export function rowToSettings(value: unknown): Settings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const sh = (v.shipping && typeof v.shipping === "object" ? v.shipping : {}) as Record<string, unknown>;
  const c = (v.contact && typeof v.contact === "object" ? v.contact : {}) as Record<string, unknown>;
  const b = (v.brand && typeof v.brand === "object" ? v.brand : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    shipping: {
      insideDhakaFee: nnInt(sh.insideDhakaFee, d.shipping.insideDhakaFee),
      outsideDhakaFee: nnInt(sh.outsideDhakaFee, d.shipping.outsideDhakaFee),
      freeShippingThreshold: nnInt(sh.freeShippingThreshold, d.shipping.freeShippingThreshold),
    },
    codFee: nnInt(v.codFee, d.codFee),
    contact: {
      phone: str(c.phone, d.contact.phone),
      whatsapp: str(c.whatsapp, d.contact.whatsapp),
      email: str(c.email, d.contact.email),
      address: str(c.address, d.contact.address),
    },
    brand: {
      tagline: str(b.tagline, d.brand.tagline),
      description: str(b.description, d.brand.description),
    },
  };
}
```

- [ ] **Step 4 — run → PASS.**

- [ ] **Step 5 — TDD `shippingFeeFor`.** `src/lib/shipping.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shippingFeeFor } from "./shipping";

describe("shippingFeeFor", () => {
  const fees = { insideDhakaFee: 80, outsideDhakaFee: 150 };
  it("uses the inside-Dhaka fee for Dhaka", () => expect(shippingFeeFor("Dhaka", fees)).toBe(80));
  it("uses the outside-Dhaka fee otherwise", () => {
    expect(shippingFeeFor("Chattogram", fees)).toBe(150);
    expect(shippingFeeFor("Unknown", fees)).toBe(150);
  });
});
```

Run → FAIL. Add to `src/lib/shipping.ts` (keep the existing exports):

```ts
/** Delivery fee for a district using admin-set zone fees (settings-driven).
 *  Reuses the district→zone map; unknown districts → outside Dhaka. */
export function shippingFeeFor(
  district: string,
  fees: { insideDhakaFee: number; outsideDhakaFee: number },
): number {
  return zoneForDistrict(district).id === "inside_dhaka" ? fees.insideDhakaFee : fees.outsideDhakaFee;
}
```

Run → PASS.

- [ ] **Step 6 — verify + commit.** `npx tsc --noEmit && npx vitest run`. Commit `feat(settings): Settings shape + rowToSettings + shippingFeeFor (TDD)`.

---

## Task 2: `getSettings` (server, fail-soft) + seed default row

**Files:** Create `src/lib/data/settings.ts`. Modify `scripts/seed.ts`.

**Interfaces:**
- Consumes: `settings-shape` (Task 1).
- Produces: `getSettings(): Promise<Settings>` (cached tag `settings`, fail-soft); a seeded `general` row.

- [ ] **Step 1 — `src/lib/data/settings.ts`:**

```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { rowToSettings, DEFAULT_SETTINGS, type Settings } from "@/lib/data/settings-shape";

async function readSettings(): Promise<Settings> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle()
      .overrideTypes<{ value: unknown }, { merge: false }>();
    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS;
    return rowToSettings(data.value);
  } catch (err) {
    console.error("getSettings failed; using defaults:", err);
    return DEFAULT_SETTINGS;
  }
}

/** Cached, tag-invalidatable store settings. An admin `updateSettings` calls
 *  `revalidateTag("settings")`. 1-hour revalidate bounds staleness. */
export const getSettings = unstable_cache(readSettings, ["site-settings"], {
  tags: ["settings"],
  revalidate: 3600,
});
```

- [ ] **Step 2 — seed the default row.** In `scripts/seed.ts`, import `DEFAULT_SETTINGS` from `@/lib/data/settings-shape` (pure, no server-only) and, near the other upserts, add:

```ts
  const settingsRes = await db.from("site_settings").upsert(
    { key: "general", value: DEFAULT_SETTINGS as unknown as Json },
    { onConflict: "key" },
  );
  if (settingsRes.error) throw settingsRes.error;
  console.log("site_settings: general row seeded");
```

(`Json` is the generated type already imported in seed.ts; if not, cast `as never`.)

- [ ] **Step 3 — verify.** `npx tsc --noEmit && npx vitest run && npm run build` (build fail-soft: no row yet → defaults, no crash). Commit `feat(settings): getSettings server read + seed default row`.

---

## Task 3: `updateSettings` action + admin Settings page + form + sidebar

**Files:** Modify `src/lib/admin/actions.ts`. Create `src/app/admin/settings/page.tsx`, `src/components/admin/settings-form.tsx`. Modify `src/components/admin/admin-sidebar.tsx`.

**Interfaces:**
- Consumes: `Settings`, `getSettings`.
- Produces: `updateSettings(next: Settings): ActionResult`.

- [ ] **Step 1 — `updateSettings` in `actions.ts`.** Import `type { Settings }` from `@/lib/data/settings-shape`. Add:

```ts
/** Validate + persist store settings to the single `site_settings.general` row.
 *  Server Action — admin re-check + service-role. Money fields are non-negative
 *  integers; strings are trimmed. */
export async function updateSettings(next: Settings): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const ints = [
    next.shipping?.insideDhakaFee, next.shipping?.outsideDhakaFee,
    next.shipping?.freeShippingThreshold, next.codFee,
  ];
  if (ints.some((n) => !isNonNegativeInt(n))) {
    return { ok: false, error: "Fees and threshold must be non-negative whole numbers." };
  }
  const value = {
    shipping: {
      insideDhakaFee: next.shipping.insideDhakaFee,
      outsideDhakaFee: next.shipping.outsideDhakaFee,
      freeShippingThreshold: next.shipping.freeShippingThreshold,
    },
    codFee: next.codFee,
    contact: {
      phone: (next.contact?.phone ?? "").trim(),
      whatsapp: (next.contact?.whatsapp ?? "").trim(),
      email: (next.contact?.email ?? "").trim(),
      address: (next.contact?.address ?? "").trim(),
    },
    brand: {
      tagline: (next.brand?.tagline ?? "").trim(),
      description: (next.brand?.description ?? "").trim(),
    },
  };

  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "general", value: value as unknown as Database["public"]["Tables"]["site_settings"]["Insert"]["value"] },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("settings", "max");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/contact");
  revalidatePath("/admin/settings");
  return { ok: true };
}
```

(If the `site_settings` `Insert.value` type is awkward, cast `value as never` in the upsert — same net effect as the ungenerated-column pattern.)

- [ ] **Step 2 — sidebar.** In `src/components/admin/admin-sidebar.tsx`, remove `disabled: true` from the `Settings` nav item (leave Customers/Inventory/Blog disabled).

- [ ] **Step 3 — admin page** `src/app/admin/settings/page.tsx` (server):

```tsx
import type { Metadata } from "next";
import { getSettings } from "@/lib/data/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

export default async function Page() {
  const settings = await getSettings();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
      <p className="mt-1 text-sm text-ink-muted">Shipping, COD, contact, and footer brand text.</p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4 — `settings-form.tsx`** (`"use client"`): controlled inputs grouped in `Card`s (Shipping, COD, Contact, Brand), a Save button calling `updateSettings`. Follow `product-edit-form.tsx` idiom (`Card`/`CardHeader`/`CardTitle`/`CardContent`, `Input`, `Button`, `useTransition`, `sonner` toast, `parseIntOrNull` for money fields). Structure:

```tsx
"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateSettings } from "@/lib/admin/actions";
import type { Settings } from "@/lib/data/settings-shape";

function parseIntOrNull(v: string): number | null {
  const t = v.trim(); if (t === "") return null;
  const n = Number(t); return Number.isInteger(n) && n >= 0 ? n : null;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [saving, start] = useTransition();
  const [insideFee, setInsideFee] = useState(String(settings.shipping.insideDhakaFee));
  const [outsideFee, setOutsideFee] = useState(String(settings.shipping.outsideDhakaFee));
  const [threshold, setThreshold] = useState(String(settings.shipping.freeShippingThreshold));
  const [codFee, setCodFee] = useState(String(settings.codFee));
  const [phone, setPhone] = useState(settings.contact.phone);
  const [whatsapp, setWhatsapp] = useState(settings.contact.whatsapp);
  const [email, setEmail] = useState(settings.contact.email);
  const [address, setAddress] = useState(settings.contact.address);
  const [tagline, setTagline] = useState(settings.brand.tagline);
  const [description, setDescription] = useState(settings.brand.description);

  const handleSave = () => {
    const nums = { inside: parseIntOrNull(insideFee), outside: parseIntOrNull(outsideFee), thr: parseIntOrNull(threshold), cod: parseIntOrNull(codFee) };
    if (Object.values(nums).some((n) => n === null)) return toast.error("Fees and threshold must be whole numbers ≥ 0.");
    const next: Settings = {
      shipping: { insideDhakaFee: nums.inside!, outsideDhakaFee: nums.outside!, freeShippingThreshold: nums.thr! },
      codFee: nums.cod!,
      contact: { phone, whatsapp, email, address },
      brand: { tagline, description },
    };
    start(async () => {
      const r = await updateSettings(next);
      r.ok ? toast.success("Settings saved.") : toast.error(r.error);
    });
  };

  // …render 4 Cards (Shipping: 3 number inputs; COD: 1; Contact: phone/whatsapp/email + address textarea; Brand: tagline input + description textarea) + a Save button calling handleSave (disabled={saving}). Use the label span style `text-xs font-medium uppercase tracking-wide text-ink-muted` from product-edit-form.
}
```

Fill in the four `Card`s with labeled `Input`s (number inputs `type="number" min={0} step={1}` for money; text inputs for contact; `textarea` for address + description, styled like product-edit-form's textarea). A single "Save changes" `Button` at the bottom.

- [ ] **Step 5 — verify + live (0007 not needed; run `npm run db:seed` first for a real row).** `npx tsc --noEmit && npx vitest run && npm run build`. Live (controller, real admin session): open `/admin/settings`, edit a fee + tagline, Save → REST shows the updated `site_settings.general`. Commit `feat(admin): settings page + form + updateSettings action; enable sidebar`.

---

## Task 4: Checkout + createOrder consume settings (money path)

**Files:** Modify `src/app/checkout/page.tsx`, `src/components/checkout/checkout-view.tsx`, `src/lib/data/orders.ts`.

**Interfaces:** Consumes `getSettings`, `shippingFeeFor` (Task 1/2).

- [ ] **Step 1 — checkout page passes settings.** `src/app/checkout/page.tsx` → make it async and pass the fee bits:

```tsx
import { getSettings } from "@/lib/data/settings";
// …
export default async function Page() {
  const settings = await getSettings();
  return (
    <CheckoutView
      insideDhakaFee={settings.shipping.insideDhakaFee}
      outsideDhakaFee={settings.shipping.outsideDhakaFee}
      freeShippingThreshold={settings.shipping.freeShippingThreshold}
      codFee={settings.codFee}
    />
  );
}
```

- [ ] **Step 2 — `checkout-view.tsx` uses props.** Add the props to the component signature:

```tsx
export function CheckoutView({
  insideDhakaFee, outsideDhakaFee, freeShippingThreshold, codFee,
}: {
  insideDhakaFee: number; outsideDhakaFee: number; freeShippingThreshold: number; codFee: number;
}) {
```

Remove the `const FREE_SHIPPING_THRESHOLD = 2000;` constant; use the `freeShippingThreshold` prop wherever it was referenced (the `freeUnlocked` computation and the `freeShippingThreshold={…}` passed to `DeliverySummary`). Replace `getShippingFee(address.district)` with `shippingFeeFor(address.district, { insideDhakaFee, outsideDhakaFee })` (import `shippingFeeFor` from `@/lib/shipping`; drop the `getShippingFee` import if now unused). Add the COD fee to the total when the chosen payment is COD:

```tsx
  const codLine = payment === "cod" ? codFee : 0;
  const total = subtotal + delivery + codLine;
```

Pass a COD line into the order summary (add a `codFee={codLine}` prop to `OrderSummary` and render a "COD fee" row when `> 0`, mirroring the existing delivery row) — and include it in the `createOrder` `deliveryFee` handoff is NOT how COD is sent; COD is recomputed server-side in Step 3, so the client just displays it.

- [ ] **Step 3 — `createOrder` authoritative fee + COD.** In `src/lib/data/orders.ts`: `import { getSettings } from "@/lib/data/settings";` and `import { shippingFeeFor } from "@/lib/shipping";`. Replace the trusted client fee (`const deliveryFee = Math.max(0, Math.round(input.deliveryFee));`) with a server recompute from the order's district + settings, plus COD:

```ts
  const settings = await getSettings();
  const deliveryFee = shippingFeeFor(input.address.district, {
    insideDhakaFee: settings.shipping.insideDhakaFee,
    outsideDhakaFee: settings.shipping.outsideDhakaFee,
  });
  const codFee = settings.codFee; // all orders are COD today
```

Fold both into the total. `computeOrderTotals(items, deliveryFee)` gives `subtotal`/`total`; add `codFee` to the persisted total + delivery. Simplest: keep `delivery_fee = deliveryFee` and set the order `total = subtotal + deliveryFee + codFee`. Update the `p_order` object: `subtotal, delivery_fee: deliveryFee, total: subtotal + deliveryFee + codFee, …`. (If you prefer, extend `computeOrderTotals` to accept `codFee`; either way the charged total must include it, server-side.) The returned `{ total }` must reflect the same figure.

- [ ] **Step 4 — verify + live.** `npx tsc --noEmit && npx vitest run && npm run build`. Live (controller): set an outside-Dhaka fee (e.g. 200) + COD fee (e.g. 20) in admin; a checkout for a non-Dhaka district shows delivery 200 + COD 20; place the order → the DB order's `total` = subtotal + 200 + 20 regardless of any client value. Commit `feat(checkout): shipping/COD fees from settings; createOrder recomputes fee server-side`.

---

## Task 5: Footer + contact page read settings

**Files:** Modify `src/components/layout/footer.tsx`, `src/app/contact/page.tsx`.

**Interfaces:** Consumes `getSettings`.

- [ ] **Step 1 — footer.** `src/components/layout/footer.tsx` is a server component. Make it async, `const settings = await getSettings();`, and replace `BRAND_DESCRIPTION` with `settings.brand.description` (keep `BRAND_NAME` from config). If the footer renders contact (email/phone), source those from `settings.contact`. Import `getSettings` from `@/lib/data/settings`.

- [ ] **Step 2 — contact page.** `src/app/contact/page.tsx` → read `getSettings()` and render the phone / WhatsApp / email / address from `settings.contact` instead of the mock `contactDetails` (keep the mock as the shape/labels; swap the values). If the mock structure makes a clean swap hard, thread `settings.contact` into the existing contact-detail rendering with the mock as fallback labels.

- [ ] **Step 3 — verify + live.** `npx tsc --noEmit && npx vitest run && npm run build`; footer/contact render the seeded values; after editing contact/tagline in admin, both reflect (revalidate). Confirm `/` and `/contact` stay static/ISR (getSettings is cookieless + cached, so no dynamic pull-in). Commit `feat(site): footer + contact read contact info & brand text from settings`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean; storefront static/ISR intact.
- [ ] End-to-end (seeded, real admin session): edit shipping fee + COD fee + contact + tagline → Save persists to `site_settings.general`; checkout shows the new delivery + COD; a placed order's total uses the server-recomputed fee (tampered client fee ignored); footer + contact reflect; DB read failure → defaults; non-admin rejected.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy (same as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** shape+defaults+shippingFeeFor → T1; getSettings fail-soft + seed → T2; updateSettings + admin page/form + sidebar → T3; checkout + createOrder authoritative fee + COD → T4; footer + contact → T5. Brand NAME/SEO untouched; no migration (table exists).
- **Placeholder scan:** none — real code/commands; the settings-form render is described field-by-field with the exact idiom to follow (its repetitive card JSX is left to the implementer, which the plan states explicitly).
- **Type consistency:** `Settings{shipping{insideDhakaFee,outsideDhakaFee,freeShippingThreshold},codFee,contact{phone,whatsapp,email,address},brand{tagline,description}}`, `rowToSettings(value)`, `DEFAULT_SETTINGS`, `getSettings()`, `shippingFeeFor(district,{insideDhakaFee,outsideDhakaFee})`, `updateSettings(next)` — consistent across tasks.
- **Fail-soft + server-authoritative fee** are the two load-bearing invariants; both stated in Global Constraints and exercised in T2/T4.
