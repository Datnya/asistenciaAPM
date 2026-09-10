"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureProfilePhotosBucket, PROFILE_PHOTOS_BUCKET } from "@/lib/supabase/profile-photos";

export async function updateOwnProfilePhoto(formData: FormData): Promise<{ success: true } | { success: false; error: string }> {
  const { profile } = await requireRole("consultant");
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || !avatar.size || avatar.size > 2 * 1024 * 1024 || avatar.type !== "image/jpeg") {
    return { success: false, error: "Selecciona una fotografía JPG ajustada de hasta 2 MB." };
  }

  const admin = createAdminSupabaseClient();
  await ensureProfilePhotosBucket(admin);
  const avatarPath = `${profile.user_id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage.from(PROFILE_PHOTOS_BUCKET).upload(avatarPath, Buffer.from(await avatar.arrayBuffer()), { contentType: "image/jpeg", upsert: false });
  if (uploadError) return { success: false, error: "No fue posible guardar la fotografía." };

  const { error: updateError } = await admin.from("profiles").update({ avatar_path: avatarPath }).eq("user_id", profile.user_id);
  if (updateError) {
    await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove([avatarPath]);
    return { success: false, error: "No fue posible actualizar el perfil." };
  }
  if (profile.avatar_path) await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove([profile.avatar_path]);
  revalidatePath("/consultant");
  revalidatePath("/consultant/profile");
  return { success: true };
}
