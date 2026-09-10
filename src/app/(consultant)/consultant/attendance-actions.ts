"use server";

import { revalidatePath } from "next/cache";

import { declaredHoursToMinutes } from "@/lib/attendance/hours";
import { getLimaWorkDate } from "@/lib/attendance/lima";
import { attendanceActivitySchema, closeAttendanceSchema, historicalAttendanceSchema, startAttendanceSchema } from "@/lib/attendance/validation";
import { requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Result = { success: true } | { success: false; error: string };
type LocationPayload = {
  status: "granted" | "permission_denied" | "position_unavailable" | "timeout" | "unsupported";
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

function locationFrom(formData: FormData): LocationPayload {
  const status = String(formData.get("locationStatus") ?? "unsupported");
  const supportedStatuses: LocationPayload["status"][] = ["granted", "permission_denied", "position_unavailable", "timeout", "unsupported"];
  const numberOrNull = (value: FormDataEntryValue | null) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  return {
    status: supportedStatuses.includes(status as LocationPayload["status"])
      ? status as LocationPayload["status"]
      : "unsupported",
    latitude: numberOrNull(formData.get("latitude")),
    longitude: numberOrNull(formData.get("longitude")),
    accuracy: numberOrNull(formData.get("accuracy")),
  };
}

function refreshAttendance() {
  revalidatePath("/consultant");
  revalidatePath("/admin");
}

export async function startLiveAttendance(formData: FormData): Promise<Result> {
  const { profile } = await requireRole("consultant");
  const parsed = startAttendanceSchema.safeParse({
    clientId: formData.get("clientId"),
    workDate: formData.get("workDate"),
    workType: formData.get("workType"),
    entryTime: formData.get("entryTime"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos de ingreso." };
  if (parsed.data.workDate !== getLimaWorkDate()) {
    return { success: false, error: "Para una fecha pasada utiliza el registro histórico; para hoy confirma el ingreso en la fecha actual." };
  }

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("attendance_sessions")
    .select("id")
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "open")
    .maybeSingle();
  if (existing) return { success: false, error: "Tienes una jornada pendiente de cierre. Finalízala antes de iniciar otra." };

  const { data: assignment } = await admin
    .from("consultant_client_assignments")
    .select("id, clients!inner(is_active)")
    .eq("consultant_user_id", profile.user_id)
    .eq("client_id", parsed.data.clientId)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return { success: false, error: "El cliente seleccionado ya no está disponible para tu jornada." };

  const location = locationFrom(formData);
  const { error } = await admin.from("attendance_sessions").insert({
    consultant_user_id: profile.user_id,
    client_id: parsed.data.clientId,
    work_date: parsed.data.workDate,
    work_type: parsed.data.workType,
    record_mode: "live",
    status: "open",
    entry_time: parsed.data.entryTime,
    entry_recorded_at: new Date().toISOString(),
    entry_location_status: location.status,
    entry_latitude: location.status === "granted" ? location.latitude : null,
    entry_longitude: location.status === "granted" ? location.longitude : null,
    entry_accuracy_m: location.status === "granted" ? location.accuracy : null,
  });
  if (error) {
    if (error.code === "23505") return { success: false, error: "Ya existe una jornada para esta fecha o una jornada pendiente de cierre." };
    return { success: false, error: "No fue posible registrar el ingreso. Inténtalo nuevamente." };
  }

  refreshAttendance();
  return { success: true };
}

export async function createHistoricalAttendance(formData: FormData): Promise<Result> {
  const { profile } = await requireRole("consultant");
  const parsed = historicalAttendanceSchema.safeParse({
    clientId: formData.get("clientId"),
    workDate: formData.get("workDate"),
    workType: formData.get("workType"),
    entryTime: formData.get("entryTime"),
    exitTime: formData.get("exitTime"),
    declaredHours: formData.get("declaredHours"),
    areaCode: formData.get("areaCode"),
    otherAreaName: formData.get("otherAreaName") || undefined,
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos de la jornada histórica." };
  if (parsed.data.workDate >= getLimaWorkDate()) {
    return { success: false, error: "El registro histórico solo permite fechas anteriores a hoy." };
  }

  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("attendance_sessions")
    .select("id")
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "open")
    .maybeSingle();
  if (existing) return { success: false, error: "Tienes una jornada pendiente de cierre. Finalízala antes de registrar una fecha anterior." };

  const location = locationFrom(formData);
  const { error } = await admin.rpc("create_historical_attendance", {
    p_consultant_user_id: profile.user_id,
    p_client_id: parsed.data.clientId,
    p_work_date: parsed.data.workDate,
    p_work_type: parsed.data.workType,
    p_entry_time: parsed.data.entryTime,
    p_exit_time: parsed.data.exitTime,
    p_declared_minutes: declaredHoursToMinutes(parsed.data.declaredHours),
    p_activities: [{
      areaCode: parsed.data.areaCode,
      otherAreaName: parsed.data.areaCode === "other" ? parsed.data.otherAreaName ?? null : null,
      description: parsed.data.description,
    }],
    p_submission_location_status: location.status,
    p_submission_latitude: location.status === "granted" ? location.latitude : null,
    p_submission_longitude: location.status === "granted" ? location.longitude : null,
    p_submission_accuracy_m: location.status === "granted" ? location.accuracy : null,
  });
  if (error) {
    if (error.code === "23505") return { success: false, error: "Ya existe una jornada no anulada para esta fecha." };
    return { success: false, error: "No fue posible registrar la jornada histórica. Revisa los datos e inténtalo nuevamente." };
  }

  refreshAttendance();
  return { success: true };
}

async function getOpenOwnSession(sessionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("attendance_sessions")
    .select("id, entry_time")
    .eq("id", sessionId)
    .eq("consultant_user_id", userId)
    .eq("status", "open")
    .maybeSingle();
  return data;
}

export async function saveAttendanceActivity(formData: FormData): Promise<Result> {
  const { profile } = await requireRole("consultant");
  const parsed = attendanceActivitySchema.safeParse({
    sessionId: formData.get("sessionId"),
    areaCode: formData.get("areaCode"),
    otherAreaName: formData.get("otherAreaName") || undefined,
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revisa la actividad." };
  if (!await getOpenOwnSession(parsed.data.sessionId, profile.user_id)) {
    return { success: false, error: "Esta jornada ya no se encuentra abierta." };
  }

  const activityId = formData.get("activityId");
  const payload = {
    area_code: parsed.data.areaCode,
    other_area_name: parsed.data.areaCode === "other" ? parsed.data.otherAreaName : null,
    description: parsed.data.description,
  };
  const { error } = typeof activityId === "string" && activityId
    ? await createAdminSupabaseClient().from("attendance_activities").update(payload).eq("id", activityId).eq("session_id", parsed.data.sessionId)
    : await createAdminSupabaseClient().from("attendance_activities").insert({ session_id: parsed.data.sessionId, ...payload });
  if (error) return { success: false, error: "No fue posible guardar la actividad." };
  refreshAttendance();
  return { success: true };
}

export async function deleteAttendanceActivity(activityId: string, sessionId: string): Promise<Result> {
  const { profile } = await requireRole("consultant");
  if (!await getOpenOwnSession(sessionId, profile.user_id)) return { success: false, error: "Esta jornada ya no se encuentra abierta." };
  const { error } = await createAdminSupabaseClient()
    .from("attendance_activities")
    .delete()
    .eq("id", activityId)
    .eq("session_id", sessionId);
  if (error) return { success: false, error: "No fue posible eliminar la actividad." };
  refreshAttendance();
  return { success: true };
}

export async function closeLiveAttendance(formData: FormData): Promise<Result> {
  const { profile } = await requireRole("consultant");
  const parsed = closeAttendanceSchema.safeParse({
    sessionId: formData.get("sessionId"),
    exitTime: formData.get("exitTime"),
    declaredHours: formData.get("declaredHours"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Revisa el cierre de jornada." };

  const session = await getOpenOwnSession(parsed.data.sessionId, profile.user_id);
  if (!session) return { success: false, error: "Esta jornada ya no se encuentra abierta." };
  if (parsed.data.exitTime < session.entry_time) return { success: false, error: "La hora de salida debe ser igual o posterior a la hora de ingreso." };

  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("attendance_activities")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);
  if (!count) return { success: false, error: "Registra al menos una actividad antes de marcar la salida." };

  const location = locationFrom(formData);
  const { error } = await admin
    .from("attendance_sessions")
    .update({
      status: "closed",
      exit_time: parsed.data.exitTime,
      exit_recorded_at: new Date().toISOString(),
      declared_minutes: declaredHoursToMinutes(parsed.data.declaredHours),
      exit_location_status: location.status,
      exit_latitude: location.status === "granted" ? location.latitude : null,
      exit_longitude: location.status === "granted" ? location.longitude : null,
      exit_accuracy_m: location.status === "granted" ? location.accuracy : null,
      closed_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "open");
  if (error) return { success: false, error: "No fue posible cerrar la jornada. Inténtalo nuevamente." };
  refreshAttendance();
  return { success: true };
}
