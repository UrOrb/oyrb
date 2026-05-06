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

  // Redirect unauthenticated users away from protected routes
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard access gates. Two redirects, in order:
  //   1. Phase 1.2 — past-due subscription, grace window expired → /dashboard/billing-pending
  //   2. Phase 2.2 — any owned business strike-paused → /dashboard/strike-paused
  //
  // Each gate exempts its own redirect target so the destination is
  // reachable. Billing wins ties (if a pro is both past-due and
  // strike-paused, billing-pending fires first — they need to fix
  // payment before reputation review can happen).
  //
  // Strike-pause is per-business (a pro can own multiple sites and have
  // one paused, the others active) but the proxy is per-user. We
  // redirect on the OR ("any owned business is strike-paused") and let
  // the /strike-paused page show which sites are affected. Matches the
  // billing redirect's per-user shape.
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const isBillingPending = request.nextUrl.pathname.startsWith("/dashboard/billing-pending");
    const isStrikePaused = request.nextUrl.pathname.startsWith("/dashboard/strike-paused");

    if (!isBillingPending && !isStrikePaused) {
      const { data: sub } = await supabase
        .from("account_subscriptions")
        .select("status, grace_period_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        sub?.status === "past_due" &&
        sub.grace_period_ends_at &&
        new Date(sub.grace_period_ends_at) < new Date()
      ) {
        return NextResponse.redirect(new URL("/dashboard/billing-pending", request.url));
      }

      // Only run the strike query when billing didn't redirect. Cheap
      // index-only scan over idx_businesses_owner_strike_paused.
      const { data: strikePaused } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .not("strike_paused_at", "is", null)
        .limit(1);

      if (strikePaused && strikePaused.length > 0) {
        return NextResponse.redirect(new URL("/dashboard/strike-paused", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/"],
};
