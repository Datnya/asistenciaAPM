"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createUserSchema, resetPasswordSchema } from "@/lib/auth/schemas";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signOutAdmin() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createManagedUser(input: unknown) {
  await requireRole("admin");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const data = parsed.data;
  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email, password: data.password, email_confirm: true,
    app_metadata: { role: data.role },
  });
  if (authError || !authData.user) return { error: "No fue posible crear el usuario." };
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: authData.user.id, username: data.username, first_name: data.firstName,
    last_name: data.lastName, auth_email: data.email, role: data.role, is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "No fue posible completar el perfil del usuario." };
  }
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetManagedUserPassword(userId: string, input: unknown) {
  await requireRole("admin");
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { error } = await createAdminSupabaseClient().auth.admin.updateUserById(userId, { password: parsed.data.password });
  return error ? { error: "No fue posible restablecer la contraseña." } : { success: true };
}

export async function setManagedUserActive(userId: string, isActive: boolean) {
  const session = await requireRole("admin");
  if (session.user.id === userId && !isActive) return { error: "No puedes desactivar tu propia cuenta." };
  const { error } = await createAdminSupabaseClient().from("profiles").update({ is_active: isActive }).eq("user_id", userId);
  if (error) return { error: "No fue posible actualizar el estado." };
  revalidatePath("/admin/users");
  return { success: true };
}
