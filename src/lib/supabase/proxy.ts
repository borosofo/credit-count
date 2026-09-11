import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes a visitor may open. Everything else needs a session (TDD §5).
const PUBLIC_PATHS = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/keepalive"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Runs on every matched request: refreshes the Supabase session cookie and
 * performs the optimistic redirect for protected routes. This is a UX check
 * only. Pages and Server Actions verify the user again, and Row Level
 * Security decides what any request may read or write.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Create a new client per request (never a module-level one).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): removing or
  // delaying this call can log users out at random. getClaims() verifies the
  // JWT signature; getSession() must never be trusted on the server.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const { pathname } = request.nextUrl;

  const withCookies = (response: NextResponse) => {
    // Keep the refreshed session cookies on any redirect we return.
    supabaseResponse.cookies.getAll().forEach((c) => response.cookies.set(c));
    return response;
  };

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/dashboard" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return withCookies(NextResponse.redirect(url));
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withCookies(NextResponse.redirect(url));
  }

  // Must return supabaseResponse as is (or copy its cookies onto any new
  // response), otherwise browser and server go out of sync and the session ends.
  return supabaseResponse;
}
