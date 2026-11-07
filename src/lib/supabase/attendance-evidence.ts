import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const ATTENDANCE_EVIDENCE_BUCKET = "attendance-evidence";

export async function uploadAttendanceEvidence(admin: SupabaseClient, userId: string, formData: FormData) {
  const files = formData.getAll("evidence");
  if (files.length < 1 || files.length > 2 || files.some((file) => !(file instanceof File) || !["image/jpeg", "image/png"].includes(file.type) || file.size < 1 || file.size > 2 * 1024 * 1024)) {
    throw new Error("Adjunta una o dos imágenes JPG o PNG de hasta 2 MB cada una.");
  }
  const { data: bucket, error: bucketError } = await admin.storage.getBucket(ATTENDANCE_EVIDENCE_BUCKET);
  if (bucketError && !/not found/i.test(bucketError.message)) throw new Error("No fue posible revisar el almacenamiento de evidencias.");
  if (!bucket) {
    const { error } = await admin.storage.createBucket(ATTENDANCE_EVIDENCE_BUCKET, { public: false, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png"] });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new Error("No fue posible preparar el almacenamiento de evidencias.");
  }
  const paths: string[] = [];
  try {
    for (const item of files) {
      const file = item as File;
      const extension = file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("No fue posible guardar la evidencia. Inténtalo nuevamente.");
      paths.push(path);
    }
    return paths;
  } catch (error) {
    if (paths.length) await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).remove(paths);
    throw error;
  }
}

export async function removeAttendanceEvidence(admin: SupabaseClient, paths: string[]) {
  if (paths.length) await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).remove(paths);
}
