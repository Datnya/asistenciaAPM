"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { declaredHoursToMinutes, normalizeDeclaredHours } from "@/lib/attendance/hours";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();
const workType = z.enum(["remote", "onsite"]);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function refresh(consultantId: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/consultants/${consultantId}`);
}

export async function correctAdminAttendance(formData: FormData) {
  const session = await requireRole("admin");
  const consultantId = uuid.safeParse(formData.get("consultantId"));
  const sessionId = uuid.safeParse(formData.get("sessionId"));
  const workDate = date.safeParse(formData.get("workDate"));
  const clientId = uuid.safeParse(formData.get("clientId"));
  const type = workType.safeParse(formData.get("workType"));
  const entryTime = time.safeParse(formData.get("entryTime"));
  const exitTime = time.safeParse(formData.get("exitTime"));
  const declared = normalizeDeclaredHours(String(formData.get("declaredHours") ?? ""));
  const declaredMinutes = declaredHoursToMinutes(declared);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!consultantId.success || !sessionId.success || !workDate.success || !clientId.success || !type.success || !entryTime.success || !exitTime.success || !declaredMinutes || reason.length < 1 || reason.length > 500) {
    return { error: "Completa fecha, tipo, horas declaradas válidas y el motivo de la corrección." };
  }

  const { error } = await createAdminSupabaseClient().rpc("apply_admin_attendance_correction", {
    p_session_id: sessionId.data,
    p_actor_user_id: session.profile.user_id,
    p_work_date: workDate.data,
    p_client_id: clientId.data,
    p_work_type: type.data,
    p_entry_time: entryTime.data,
    p_exit_time: exitTime.data,
    p_declared_minutes: declaredMinutes,
    p_reason: reason,
  });
  if (error) return { error: error.message || "No fue posible corregir la asistencia." };
  refresh(consultantId.data);
  return { success: true };
}

export async function deleteAdminAttendance(formData: FormData) {
  await requireRole("admin");
  const consultantId = uuid.safeParse(formData.get("consultantId"));
  const sessionId = uuid.safeParse(formData.get("sessionId"));
  if (!consultantId.success || !sessionId.success) return { error: "La asistencia indicada no es válida." };

  const { error } = await createAdminSupabaseClient().rpc("delete_admin_attendance", { p_session_id: sessionId.data });
  if (error) return { error: error.message || "No fue posible eliminar la asistencia." };
  refresh(consultantId.data);
  return { success: true };
}
