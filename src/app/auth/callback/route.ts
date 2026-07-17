import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Supabase redirects here after Google OAuth or an email-confirmation link
// is followed. `createServerSupabase()` binds to the async `cookies()` store
// from `next/headers`; per node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md
// ("Setting cookies is not supported during Server Component rendering...
// invoke a Server Function from the client or use a Route Handler") and
// route.md's "Cookies" example, `cookieStore.set()` IS supported here because
// this is a Route Handler, not a Server Component — so the session cookies
// written by `exchangeCodeForSession` persist correctly via the response's
// `Set-Cookie` headers without needing the request/response cookie bridge
// that `src/proxy.ts` uses (that bridge is only required in Proxy/Middleware,
// which has no direct `cookies().set()` support).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/signin?error=missing_code`);
}
