import Image from "next/image";
import Link from "next/link";

export function DashboardBrand() {
  return (
    <Link
      aria-label="Ir al dashboard de APM Control"
      className="flex min-h-11 items-center gap-4 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#92a300] sm:gap-6"
      href="/consultant"
    >
      <span className="relative block h-14 w-[145px] overflow-hidden sm:w-[158px]">
        <Image
          alt="APM Group"
          className="object-cover mix-blend-multiply"
          fill
          priority
          sizes="158px"
          src="/branding/apm-logo.jpg"
        />
      </span>
      <span aria-hidden="true" className="hidden h-9 w-px bg-[#aeb5c1] sm:block" />
      <span className="hidden text-[20px] font-bold tracking-[-0.035em] sm:block lg:text-[22px]">APM Control</span>
    </Link>
  );
}
