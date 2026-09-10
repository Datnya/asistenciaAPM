import Image from "next/image";

export function LoginBrand() {
  return (
    <div className="login-logo relative aspect-[2.1/1] w-[230px] max-w-[62vw] overflow-hidden sm:w-[270px]">
      <Image
        alt="APM Group"
        className="object-cover mix-blend-multiply"
        fill
        priority
        sizes="(max-width: 640px) 62vw, 270px"
        src="/branding/apm-logo.jpg"
      />
    </div>
  );
}
