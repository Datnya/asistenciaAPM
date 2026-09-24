"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthEmailForUsername } from "@/lib/auth/auth-email";
import { getLoginErrorMessage } from "@/lib/auth/login";
import { buildAuthAlias } from "@/lib/auth/username";
import { loginSchema } from "@/lib/auth/schemas";

export type LoginResult = { error?: string; redirectTo?: "/admin" | "/consultant" };

export async function signInWithUsername(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };

  const domain = process.env.AUTH_USERNAME_DOMAIN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!domain || !url || !publishableKey) return { error: "El acceso no está configurado." };

  try {
    const email = await getAuthEmailForUsername(parsed.data.username)
      ?? buildAuthAlias(parsed.data.username, domain);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (error) return { error: getLoginErrorMessage(error) };

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("role, is_active").eq("user_id", user.id).maybeSingle()
      : { data: null };

    if (!profile?.is_active || !user) {
      await supabase.auth.signOut();
      return { error: "Tu cuenta no tiene acceso activo." };
    }

    const role = user.app_metadata.role;
    if ((role !== "admin" && role !== "consultant") || role !== profile.role) {
      await supabase.auth.signOut();
      return { error: "Tu cuenta no tiene acceso activo." };
    }
    return { redirectTo: role === "admin" ? "/admin" : "/consultant" };
  } catch {
    return { error: "No fue posible validar el acceso. Inténtalo nuevamente o contacta a administración." };
  }
}
