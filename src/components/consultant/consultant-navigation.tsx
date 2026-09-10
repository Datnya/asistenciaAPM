"use client";

import { House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/consultant", label: "Dashboard", icon: House },
  { href: "/consultant/profile", label: "Perfil", icon: UserRound },
] as const;

export function ConsultantNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación del consultor" className={cn(mobile ? "flex gap-2" : "space-y-2")}>
      {navigation.map((item) => {
        const isActive = item.href === "/consultant" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-14 items-center gap-5 rounded-r-2xl px-6 text-[17px] font-medium text-[#687185] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#92a300]",
              mobile && "min-h-12 flex-1 justify-center rounded-xl px-3 text-sm sm:text-base",
              isActive && "bg-[#f3f6e9] font-semibold text-[#6e8800]",
              !mobile && isActive && "before:absolute before:inset-y-0 before:left-[-8px] before:w-1 before:rounded-r-full before:bg-[#a9c400]",
              !isActive && "hover:bg-[#f7f8fa] hover:text-[#202632]",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="size-7 shrink-0" strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
