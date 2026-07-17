import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/admin";

// NOTE: In this Next.js version (16), the `middleware` file convention is
// deprecated and renamed to `proxy` — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// ("How to Migrate" / "middleware to proxy"). This file is the direct
// replacement for what would previously have been `middleware.ts`; the
// exported function is named `proxy` (not `middleware`) per that guide, and
// it lives at `src/proxy.ts` (same level as `src/app`), matching "Create a
// proxy.ts (or .js) file in the project root, or inside src if applicable,
// so that it is located at the same level as pages or app."

/**
 * Runs on every matched request (see `config.matcher` below).
 *
 * 1. Refreshes the Supabase auth session cookie via the official
 *    `@supabase/ssr` request/response cookie bridge — required so sessions
 *    don't silently expire (see @supabase/ssr's createServerClient docs).
 * 2. Gates `/admin/*`: no signed-in user -> redirect to `/signin?next=<path>`;
 *    signed-in but not an admin -> redirect to `/`.
 */
export async function proxy(request: NextRequest) {
  // Build the response up front and mutate the SAME instance throughout, so
  // that any refreshed auth cookies set via `setAll` end up on the response
  // that is actually returned.
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) => {
          // Cookies must be set on both the request (so this same request's
          // downstream server components see the refreshed session) and the
          // response (so the browser receives it).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and getUser().
  // A simple mistake could make it very hard to debug issues with users
  // being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = new URL("/signin", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (!isAdmin(user.email)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // IMPORTANT: the response returned here must be the same `response` object
  // whose cookies were populated above (via setAll), or refreshed cookies
  // will be dropped.
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (must not be gated — it's how the session is established)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
