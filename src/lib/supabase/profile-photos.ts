import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

export async function ensureProfilePhotosBucket(admin: SupabaseClient) {
  const { data } = await admin.storage.getBucket(PROFILE_PHOTOS_BUCKET);
  if (data) return;

  const { error } = await admin.storage.createBucket(PROFILE_PHOTOS_BUCKET, {
    public: false,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg"],
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error("No fue posible preparar el almacenamiento privado de fotografías.");
  }
}
