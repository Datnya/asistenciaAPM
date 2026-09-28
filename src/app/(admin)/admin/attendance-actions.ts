"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { declaredHoursToMinutes, normalizeDeclaredHours } from "@/lib/attendance/hours";
import { attendanceActivitySchema } from "@/lib/attendance/validation";
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

  if (!consultantId.success || !sessionId.success || !workDate.success || !clientId.success || !type.success || !entryTime.success || !exitTime.success || !declaredMinutes) {
    return { error: "Completa fecha, cliente, tipo y horas declaradas válidas." };
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

export async function updateAdminAttendanceActivity(formData: FormData) {
  await requireRole("admin");
  const consultantId = uuid.safeParse(formData.get("consultantId"));
  const activityId = uuid.safeParse(formData.get("activityId"));
  const activity = attendanceActivitySchema.safeParse({
    sessionId: formData.get("sessionId"),
    areaCode: formData.get("areaCode"),
    otherAreaName: formData.get("otherAreaName") || undefined,
    description: formData.get("description"),
  });
  if (!consultantId.success || !activityId.success || !activity.success) return { error: "Completa los datos válidos de la actividad." };

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("attendance_sessions")
    .select("id")
    .eq("id", activity.data.sessionId)
    .eq("consultant_user_id", consultantId.data)
    .maybeSingle();
  if (!session) return { error: "La jornada indicada ya no está disponible." };

  const { error } = await admin
    .from("attendance_activities")
    .update({
      area_code: activity.data.areaCode,
      other_area_name: activity.data.areaCode === "other" ? activity.data.otherAreaName : null,
      description: activity.data.description,
    })
    .eq("id", activityId.data)
    .eq("session_id", session.id);
  if (error) return { error: "No fue posible guardar la actividad." };
  refresh(consultantId.data);
  return { success: true };
}
