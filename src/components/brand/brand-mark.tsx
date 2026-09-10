import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
  priority?: boolean;
};

export function BrandMark({ className, compact = false, priority = false }: BrandMarkProps) {
  return (
    <div
      aria-label="APM Control"
      className={cn(
        "flex items-center",
        compact ? "gap-3" : "flex-col text-center",
        className,
      )}
    >
      <Image
        alt="APM Group"
        className={cn("h-auto object-contain", compact ? "w-36" : "w-full max-w-72")}
        height={360}
        priority={priority}
        src="/branding/apm-logo.jpg"
        width={640}
      />
      <p className={cn("font-semibold tracking-tight text-foreground", compact ? "text-base" : "mt-2 text-lg")}>
        APM Control
      </p>
    </div>
  );
}
