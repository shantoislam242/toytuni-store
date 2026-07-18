import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Anon-key client for PUBLIC, user-independent reads (catalog + taxonomy).
 *
 * Unlike {@link createServerSupabase} (from `@supabase/ssr`), this does NOT
 * read `cookies()`. Reading cookies in a Server Component forces the route to
 * render dynamically — mounting the cookie-based client in the ROOT layout
 * therefore made EVERY route dynamic, a sitewide static/ISR regression. The
 * public catalog/taxonomy are the same for every visitor and need no session,
 * so they use this cookie-less client and can be cached across requests and
 * safely prerendered.
 *
 * Still RLS-guarded (anon key) — identical read permissions to the cookie
 * client, just without the cookie/session coupling. Never use it for
 * auth-dependent reads (those must stay on `createServerSupabase`).
 */
export function createPublicSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
