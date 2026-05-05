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

  // Subscription gate (Phase 1.2). Past-due pros keep full dashboard access
  // during the 2-day grace window — only AFTER grace expires do we redirect
  // them to /dashboard/billing-pending. The billing-pending page itself is
  // exempt so the redirect target is reachable.
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const isBillingPending = request.nextUrl.pathname.startsWith("/dashboard/billing-pending");
    if (!isBillingPending) {
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
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/"],
};
