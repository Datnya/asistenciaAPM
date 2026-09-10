import type { ReactNode } from "react";

import { ConsultantNavigation } from "@/components/consultant/consultant-navigation";
import { ConsultantUserMenu } from "@/components/consultant/consultant-user-menu";
import { DashboardBrand } from "@/components/consultant/dashboard-brand";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ConsultantLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { profile } = await requireRole("consultant");
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <div className="min-h-svh bg-[#f8f9fb] font-login text-[#0b0b0d]">
      <header className="sticky top-0 z-30 h-20 border-b border-[#eceef1] bg-white/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <DashboardBrand />
          <ConsultantUserMenu
            avatarPath={profile.avatar_path}
            fullName={fullName}
            userId={profile.user_id}
          />
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full">
        <aside className="hidden w-[268px] shrink-0 border-r border-[#eceef1] bg-white px-2 py-10 lg:block">
          <ConsultantNavigation />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-[#eceef1] bg-white px-4 py-2 lg:hidden">
            <ConsultantNavigation mobile />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
