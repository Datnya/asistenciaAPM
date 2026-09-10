"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { loginSchema } from "@/lib/auth/schemas";
import { signInWithUsername } from "./actions";

type LoginInput = z.input<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setServerError(undefined);
    const result = await signInWithUsername(values);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    router.replace(result.redirectTo!);
    router.refresh();
  }

  return (
    <form className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label className="text-[14px] leading-5 font-semibold text-foreground" htmlFor="username">
          Usuario
        </label>
        <div className="login-input mt-1.5 flex h-[48px] items-center rounded-xl border border-[#cbd2dc] bg-background transition focus-within:border-[#929dab] focus-within:ring-4 focus-within:ring-[#b0bf12]/15">
          <UserRound aria-hidden="true" className="ml-3.5 size-5 shrink-0 stroke-[1.8] text-[#707b8d]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-foreground outline-none placeholder:text-[#7b8494] sm:text-[16px]"
            id="username"
            autoCapitalize="none"
            autoComplete="username"
            placeholder="Usuario"
            spellCheck={false}
            {...register("username")}
          />
        </div>
        {errors.username && (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            {errors.username.message}
          </p>
        )}
      </div>

      <div>
        <label className="text-[14px] leading-5 font-semibold text-foreground" htmlFor="password">
          Contraseña
        </label>
        <div className="login-input mt-1.5 flex h-[48px] items-center rounded-xl border border-[#cbd2dc] bg-background transition focus-within:border-[#929dab] focus-within:ring-4 focus-within:ring-[#b0bf12]/15">
          <LockKeyhole aria-hidden="true" className="ml-3.5 size-5 shrink-0 stroke-[1.8] text-[#707b8d]" />
          <input
            className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-foreground outline-none placeholder:text-[#7b8494] sm:text-[16px]"
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Contraseña"
            {...register("password")}
          />
          <button
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-[#657184] transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-5 stroke-[1.8]" />
            ) : (
              <Eye aria-hidden="true" className="size-5 stroke-[1.8]" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <button
        className="login-submit mt-5 flex h-[52px] w-full items-center justify-center rounded-xl px-6 text-[16px] font-bold text-primary-foreground transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 sm:text-[18px]"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
