import { ChevronDown, LogOut } from "lucide-react";

import { signOutConsultant } from "@/app/(consultant)/consultant/actions";
import { ProfileAvatar } from "@/components/shared/profile-avatar";

type ConsultantUserMenuProps = {
  userId: string;
  fullName: string;
  avatarPath?: string | null;
};

export function ConsultantUserMenu({ userId, fullName, avatarPath }: ConsultantUserMenuProps) {
  return (
    <details className="group relative">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl px-2 outline-none transition-colors hover:bg-[#f7f8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#92a300] [&::-webkit-details-marker]:hidden">
        <ProfileAvatar avatarPath={avatarPath} className="size-12" fullName={fullName} userId={userId} />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-48 truncate text-[15px] font-bold tracking-[-0.02em] lg:text-[17px]">{fullName}</span>
          <span className="mt-0.5 block text-sm text-[#697186]">Consultor</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-5 text-[#697186] transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute top-[calc(100%+0.65rem)] right-0 z-40 w-56 rounded-2xl border border-[#e8eaee] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
        <form action={signOutConsultant}>
          <button
            aria-label="Cerrar sesión"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-[#343946] transition-colors hover:bg-[#f3f5f7] focus-visible:outline-2 focus-visible:outline-[#92a300]"
            type="submit"
          >
            <LogOut aria-hidden="true" className="size-5" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </details>
  );
}
