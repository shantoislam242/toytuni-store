"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  validateDraft,
  normalizeBdPhone,
  type AddressDraft,
} from "@/lib/checkout/address-fields";
import type { Address } from "@/lib/types";

/** `customer_addresses` postpends the generated types (migration 0020), so
 *  reads/writes use the `as never` escape hatch — same as coupons / wishlist.
 *  Every call is session-scoped by `user_id`; the browser never reads the
 *  table directly (RLS zero-policy). */
type AddressRow = {
  id: string;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  division: string;
  district: string;
  area: string;
  address_line: string;
  landmark: string | null;
  is_default: boolean;
};

const SELECT =
  "id, full_name, phone, alt_phone, email, division, district, area, address_line, landmark, is_default";

type SaveResult = { ok: true; id: string } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

function rowToAddress(r: AddressRow): Address {
  return {
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    altPhone: r.alt_phone ?? undefined,
    email: r.email ?? undefined,
    division: r.division,
    district: r.district,
    area: r.area,
    addressLine: r.address_line,
    landmark: r.landmark ?? undefined,
    isDefault: r.is_default,
  };
}

/** Normalize a validated draft into DB column shape (phones → `+880…`, blank
 *  optionals → null). */
function draftToColumns(draft: AddressDraft) {
  return {
    full_name: draft.fullName.trim(),
    phone: normalizeBdPhone(draft.phone),
    alt_phone: draft.altPhone.trim() ? normalizeBdPhone(draft.altPhone) : null,
    email: draft.email.trim() || null,
    division: draft.division,
    district: draft.district,
    area: draft.area.trim(),
    address_line: draft.addressLine.trim(),
    landmark: draft.landmark.trim() || null,
  };
}

type AdminDb = ReturnType<typeof createAdminSupabase>;

/** Clear the user's current default (so a new one can be set). */
async function clearDefaults(db: AdminDb, userId: string): Promise<void> {
  const { error } = await db
    .from("customer_addresses" as never)
    .update({ is_default: false } as never)
    .eq("user_id", userId)
    .eq("is_default", true);
  if (error) console.error("clearDefaults failed:", error);
}

/** The signed-in user's saved addresses, default-first then newest. `[]` for a
 *  signed-out visitor or on read error (fail-soft). */
export async function listAddresses(): Promise<Address[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const db = createAdminSupabase();
  const { data, error } = await db
    .from("customer_addresses" as never)
    .select(SELECT)
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .overrideTypes<AddressRow[], { merge: false }>();

  if (error) {
    console.error("listAddresses failed:", error);
    return [];
  }
  return (data ?? []).map(rowToAddress);
}

export async function createAddress(
  draft: AddressDraft,
  makeDefault: boolean,
): Promise<SaveResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to save an address." };
  if (Object.keys(validateDraft(draft)).length) {
    return { ok: false, error: "Please fill in all required fields correctly." };
  }

  const db = createAdminSupabase();
  // The first address a user saves becomes their default automatically.
  const { count } = await db
    .from("customer_addresses" as never)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isDefault = makeDefault || (count ?? 0) === 0;

  if (isDefault) await clearDefaults(db, user.id);

  const { data, error } = await db
    .from("customer_addresses" as never)
    .insert({ ...draftToColumns(draft), user_id: user.id, is_default: isDefault } as never)
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) {
    console.error("createAddress failed:", error);
    return { ok: false, error: "Could not save the address. Please try again." };
  }
  revalidatePath("/account/addresses");
  return { ok: true, id: data.id };
}

export async function updateAddress(
  id: string,
  draft: AddressDraft,
  makeDefault: boolean,
): Promise<SaveResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to edit an address." };
  if (Object.keys(validateDraft(draft)).length) {
    return { ok: false, error: "Please fill in all required fields correctly." };
  }

  const db = createAdminSupabase();
  if (makeDefault) await clearDefaults(db, user.id);

  const patch = { ...draftToColumns(draft), ...(makeDefault ? { is_default: true } : {}) };
  const { data, error } = await db
    .from("customer_addresses" as never)
    .update(patch as never)
    .eq("id", id)
    .eq("user_id", user.id) // ownership: never touch another user's row
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) {
    console.error("updateAddress failed:", error);
    return { ok: false, error: "Could not update the address. Please try again." };
  }
  revalidatePath("/account/addresses");
  return { ok: true, id: data.id };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const db = createAdminSupabase();
  await clearDefaults(db, user.id);
  const { error } = await db
    .from("customer_addresses" as never)
    .update({ is_default: true } as never)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("setDefaultAddress failed:", error);
    return { ok: false, error: "Could not set the default address." };
  }
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const db = createAdminSupabase();
  // Was this the default? If so, promote another address afterwards.
  const { data: target } = await db
    .from("customer_addresses" as never)
    .select("is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
    .overrideTypes<{ is_default: boolean }, { merge: false }>();

  const { error } = await db
    .from("customer_addresses" as never)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("deleteAddress failed:", error);
    return { ok: false, error: "Could not delete the address." };
  }

  // Keep exactly one default: if we removed it, promote the newest remaining.
  if (target?.is_default) {
    const { data: next } = await db
      .from("customer_addresses" as never)
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .overrideTypes<{ id: string }, { merge: false }>();
    if (next) {
      await db
        .from("customer_addresses" as never)
        .update({ is_default: true } as never)
        .eq("id", next.id)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/account/addresses");
  return { ok: true };
}
