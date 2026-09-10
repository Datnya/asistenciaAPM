import "server-only";

import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/constants/domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getActiveSessionProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, first_name, last_name, role, is_active, dni, phone_number, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_active) return null;
  return { user, profile };
}

export async function requireRole(role: AppRole) {
  const session = await getActiveSessionProfile();
  if (!session) redirect("/login");
  if (session.user.app_metadata.role !== role || session.profile.role !== role) redirect("/login");
  return session;
}
