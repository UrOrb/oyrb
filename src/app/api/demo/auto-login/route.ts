import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isDemoMode, DEMO_EMAIL, demoUserPassword } from "@/lib/demo";

/**
 * Auto-login endpoint that signs the visitor in as the single shared
 * demo user. Only active when DEMO_MODE=true; returns 404 otherwise so
 * production accidentally hitting this does nothing. The proxy redirects
 * unauthenticated demo-mode visitors here; a successful sign-in sets the
 * Supabase session cookies and bounces them to the intended route (or
 * the dashboard by default).
 */
export async function GET(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dest = request.nextUrl.searchParams.get("dest") || "/dashboard/site";
  const jar = await cookies();

  // Use createServerClient so the sign-in call writes Supabase session
  // cookies directly onto the response the way the normal auth flow does.
  const response = NextResponse.redirect(new URL(dest, request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: demoUserPassword(),
  });
  if (error) {
    return NextResponse.json(
      { error: `Demo login failed: ${error.message}` },
      { status: 500 }
    );
  }
  return response;
}
