import Link from "next/link";
import Image from "next/image";
import { Sidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness, listMySites } from "@/lib/current-site";
import { SiteSwitcher } from "./site-switcher";

export const metadata = {
  title: "Dashboard",
};

// Mirrors the favicon (src/app/icon.tsx): pink→magenta→purple gradient with
// a pink/purple glow. Used for the avatar ring + fallback background so the
// dashboard chrome ties back to the brand mark.
const FAVICON_GRADIENT = "linear-gradient(135deg, #FF6EC7 0%, #D946EF 50%, #A855F7 100%)";
const FAVICON_GLOW = "0 0 0 2px #fff, 0 0 0 3px #D946EF, 0 2px 8px rgba(217,70,239,0.45)";

function initialFor(name: string | null | undefined, email: string | null | undefined) {
  const source = (name || email || "U").trim();
  const ch = source.charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(ch) ? ch : "U";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load every site the user owns so the switcher in the header can show
  // them all. The cookie-driven getCurrentBusiness picks the active one.
  const [activeBusiness, mySites] = await Promise.all([
    user ? getCurrentBusiness() : Promise.resolve(null),
    user ? listMySites() : Promise.resolve([]),
  ]);
  const profileImageUrl = activeBusiness?.profile_image_url ?? null;

  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const initial = initialFor(fullName, user?.email);
  const altLabel = fullName || user?.email || "Your profile";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center border-b border-[#E7E5E4] px-6">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              {mySites.length > 1 && activeBusiness && (
                <>
                  <span className="hidden sm:inline">Editing</span>
                  <SiteSwitcher
                    sites={mySites}
                    activeId={activeBusiness.id}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/settings"
                aria-label="Open your profile settings"
                title="Profile settings"
                className="group relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white shadow-sm outline-none ring-offset-2 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#D946EF]"
                style={{
                  background: FAVICON_GRADIENT,
                  boxShadow: FAVICON_GLOW,
                }}
              >
                {profileImageUrl ? (
                  <Image
                    src={profileImageUrl}
                    alt={altLabel}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <span className="select-none">{initial}</span>
                )}
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
