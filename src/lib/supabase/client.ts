import { createBrowserClient } from "@supabase/ssr";

/** Anon-key client for client components. Safe to expose — RLS is the wall. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
