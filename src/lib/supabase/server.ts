import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Guard: this module imports server-only APIs (cookies()) and exposes
// createAdminClient() which uses the SUPABASE_SERVICE_ROLE_KEY. It must
// never be bundled into client code. `next/headers` already throws if
// imported into a client component, but make the intent explicit:
if (typeof window !== "undefined") {
  throw new Error("@/lib/supabase/server must only be imported on the server");
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — handled by middleware
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
