import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function getAuthEmailForUsername(username: string): Promise<string | null> {
  const { data, error } = await createAdminSupabaseClient()
    .from("profiles")
    .select("auth_email")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error("No fue posible buscar las credenciales del usuario.");
  return data?.auth_email ?? null;
}
