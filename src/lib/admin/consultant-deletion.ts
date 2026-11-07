import "server-only";

import { ATTENDANCE_EVIDENCE_BUCKET } from "@/lib/supabase/attendance-evidence";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/supabase/profile-photos";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function removeUserFolder(userId: string, bucketName: string) {
  const admin = createAdminSupabaseClient();
  const { data: bucket, error: bucketError } = await admin.storage.getBucket(bucketName);
  if (!bucket && /not found/i.test(bucketError?.message ?? "")) return;
  if (bucketError) throw new Error(`No fue posible revisar el almacenamiento ${bucketName}.`);

  for (let batch = 0; batch < 1000; batch++) {
    const { data: objects, error } = await admin.storage.from(bucketName).list(userId, { limit: 100 });
    if (error) throw new Error(`No fue posible listar los archivos de ${bucketName}.`);
    if (!objects?.length) return;
    const paths = objects.map((object) => `${userId}/${object.name}`);
    const { error: deleteError } = await admin.storage.from(bucketName).remove(paths);
    if (deleteError) throw new Error(`No fue posible eliminar los archivos de ${bucketName}.`);
  }
  throw new Error(`Quedan archivos pendientes en ${bucketName}.`);
}

export async function completeConsultantDeletion(jobId: string) {
  const admin = createAdminSupabaseClient();
  const { data: job, error } = await admin
    .from("consultant_deletion_jobs")
    .select("id, consultant_user_id, username, storage_deleted, auth_deleted")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !job) throw new Error("La limpieza pendiente ya no está disponible.");

  if (!job.storage_deleted) {
    await removeUserFolder(job.consultant_user_id, PROFILE_PHOTOS_BUCKET);
    await removeUserFolder(job.consultant_user_id, ATTENDANCE_EVIDENCE_BUCKET);
    const { error: updateError } = await admin.from("consultant_deletion_jobs").update({ storage_deleted: true }).eq("id", job.id);
    if (updateError) throw new Error("No fue posible confirmar la limpieza de imágenes.");
  }

  if (!job.auth_deleted) {
    const { error: authError } = await admin.auth.admin.deleteUser(job.consultant_user_id);
    if (authError && authError.status !== 404) throw new Error("No fue posible retirar las credenciales de Supabase Auth.");
    const { error: updateError } = await admin.from("consultant_deletion_jobs").update({ auth_deleted: true }).eq("id", job.id);
    if (updateError) throw new Error("No fue posible confirmar la limpieza de credenciales.");
  }

  const { error: deleteError } = await admin.from("consultant_deletion_jobs").delete().eq("id", job.id);
  if (deleteError) throw new Error("No fue posible cerrar la tarea de limpieza.");
}
