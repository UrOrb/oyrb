import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Demo-mode routing ────────────────────────────────────────────────
  // On the demo deployment the marketing homepage isn't relevant — the
  // whole point is to drop visitors straight into Jasmine Carter's
  // authenticated dashboard. So:
  //   · "/" → /dashboard/site (both before and after auto-login)
  //   · any unauthenticated visit → /api/demo/auto-login with dest
  //     preserving the requested path (or the dashboard for "/")
  if (process.env.DEMO_MODE === "true") {
    const isRoot = request.nextUrl.pathname === "/";

    // Already-authenticated demo visitor hitting "/" → skip the marketing
    // page and go straight to the dashboard.
    if (user && isRoot) {
      return NextResponse.redirect(new URL("/dashboard/site", request.url));
    }

    // Unauthenticated demo visitor on any matched path → sign in first.
    // Normalize "/" so the post-login redirect lands on the dashboard,
    // not back on the marketing homepage.
    if (!user && !request.nextUrl.pathname.startsWith("/api/demo/auto-login")) {
      const normalizedPath = isRoot ? "/dashboard/site" : request.nextUrl.pathname;
      const dest = normalizedPath + request.nextUrl.search;
      const url = new URL("/api/demo/auto-login", request.url);
      url.searchParams.set("dest", dest);
      return NextResponse.redirect(url);
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/"],
};
