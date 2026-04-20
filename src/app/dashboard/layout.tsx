import { Sidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness, listMySites } from "@/lib/current-site";
import { SiteSwitcher } from "./site-switcher";
import { AvatarMenu } from "./avatar-menu";

export const metadata = {
  title: "Dashboard",
};

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

  // Menu's "View my site" link. Prefer the active site if published; fall
  // back to the first published site in the user's list. Null when nothing
  // is published — menu item hides in that case.
  const activePublished = activeBusiness?.is_published ? activeBusiness : null;
  const firstPublished =
    activePublished ?? mySites.find((s) => s.is_published) ?? null;
  const viewSiteHref = firstPublished ? `/s/${firstPublished.slug}` : null;

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
              <AvatarMenu
                profileImageUrl={profileImageUrl}
                initial={initial}
                altLabel={altLabel}
                email={user?.email ?? null}
                displayName={fullName}
                viewSiteHref={viewSiteHref}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
