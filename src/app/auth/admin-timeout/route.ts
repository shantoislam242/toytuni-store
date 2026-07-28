import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Admin session-timeout sign-out. The admin layout redirects here when an
 * admin's session exceeds the absolute cap (see `admin-session.ts`). We clear
 * the Supabase session (route handlers CAN set cookies) and send the user to
 * sign in again with a reason the signin page can surface.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  const url = new URL("/signin?reason=admin_timeout", request.url);
  return NextResponse.redirect(url);
}
