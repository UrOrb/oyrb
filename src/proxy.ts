import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  sanitizeReferralValue,
  normalizeReferrerUrl,
  parseReferralCookie,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrer-classifier";

const REFERRAL_COOKIE_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

/**
 * Phase 5 — capture referral signals on every storefront visit, set a
 * short-lived cookie, and return early without running the dashboard
 * auth + Supabase logic that the rest of the proxy needs.
 *
 * Strict last-touch: every /s/:slug* hit overwrites the cookie. A
 * client who arrives via Instagram, browses, leaves, and returns
 * direct gets attributed to "Direct" on the second visit. Predictable
 * over clever — pros who want richer multi-touch attribution get a
 * future phase.
 *
 * The Referer-derived URL is filtered for self-referrals (oyrb.space
 * pages linking to oyrb.space pages) at normalize time. Internal
 * navigations don't overwrite with meaningless self-referrer data.
 *
 * Cookie security: HttpOnly + SameSite=Lax + Secure (prod) + 24h
 * expiry. No client-side JS access; only server reads at booking
 * creation. No PII — only UTM params and a hostname+pathname referrer
 * string (query + fragment stripped).
 */
function captureReferralAndPass(request: NextRequest): NextResponse {
  const response = NextResponse.next({ request });

  const utm_source = sanitizeReferralValue(
    request.nextUrl.searchParams.get("utm_source"),
  );
  const utm_medium = sanitizeReferralValue(
    request.nextUrl.searchParams.get("utm_medium"),
  );
  const utm_campaign = sanitizeReferralValue(
    request.nextUrl.searchParams.get("utm_campaign"),
  );
  const referrer_url = normalizeReferrerUrl(request.headers.get("referer"));

  // Phase 5 closer — preserve session_id across last-touch overwrites.
  // The proxy rotates utm/referrer fields per visit (strict last-touch
  // from PR #35) but the session_id stays sticky across the cookie's
  // 24h life. View tracking uses session_id for 30-minute dedup
  // against the storefront_views table; rotating the session_id every
  // visit would defeat that.
  const existing = parseReferralCookie(
    request.cookies.get(REFERRAL_COOKIE_NAME)?.value,
  );
  const session_id = existing.session_id ?? crypto.randomUUID();

  const payload = JSON.stringify({
    utm_source,
    utm_medium,
    utm_campaign,
    referrer_url,
    session_id,
    captured_at: new Date().toISOString(),
  });

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: payload,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    domain: isProd ? ".oyrb.space" : undefined,
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_SEC,
  });

  return response;
}

export async function proxy(request: NextRequest) {
  // Phase 5 — capture referral signals on storefront visits BEFORE
  // running any auth / Supabase logic. Storefront traffic doesn't
  // need the dashboard session machinery and runs at much higher
  // volume than dashboard requests; short-circuiting here keeps the
  // happy path cheap.
  if (request.nextUrl.pathname.startsWith("/s/")) {
    return captureReferralAndPass(request);
  }

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
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/",
    // Phase 5 — storefront referral capture. Runs the early-return
    // captureReferralAndPass branch in proxy() above.
    "/s/:slug*",
  ],
};
