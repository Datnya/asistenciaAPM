import { LoginBrand } from "@/components/brand/login-brand";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="login-page flex h-svh items-center overflow-hidden px-5 py-5 font-login sm:px-8 sm:py-7 lg:py-[clamp(24px,5vh,52px)]">
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
        <LoginBrand />
        <section className="login-card mt-4 w-full rounded-[20px] bg-background px-5 py-5 sm:mt-5 sm:px-8 sm:py-6 lg:px-9 lg:py-7">
          <header className="text-center">
            <h1 className="text-[27px] leading-[1.15] font-extrabold tracking-[-0.035em] text-foreground sm:text-[31px] lg:text-[34px]">
              Iniciar sesión
            </h1>
            <p className="mt-1.5 text-[14px] leading-5 font-normal text-[#545a68] sm:text-[15px] lg:text-[16px]">
              Ingresa tu usuario y contraseña para continuar
            </p>
          </header>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
