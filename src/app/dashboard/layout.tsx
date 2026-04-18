import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center border-b border-[#E7E5E4] px-6">
          <div className="flex flex-1 items-center justify-between">
            <div />
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#E7E5E4] flex items-center justify-center text-xs font-medium text-[#525252]">
                U
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
