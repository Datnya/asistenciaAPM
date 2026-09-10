import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardMetricProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
};

export function DashboardMetric({ icon: Icon, label, value, valueClassName }: DashboardMetricProps) {
  return (
    <article className="flex min-h-[185px] items-center gap-6 rounded-[17px] border border-[#eff0f2] bg-white px-6 py-7 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:px-7">
      <div className="flex size-[96px] shrink-0 items-center justify-center rounded-full bg-[#f1f5e8] text-[#577600]">
        <Icon aria-hidden="true" className="size-12" strokeWidth={2.15} />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] leading-snug text-[#59637a]">{label}</p>
        <p className={cn("mt-2 text-[31px] leading-tight font-bold tracking-[-0.04em]", valueClassName)}>{value}</p>
      </div>
    </article>
  );
}
