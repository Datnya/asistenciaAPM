"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActiveSessionProfile, requireRole } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const date = z.string().date();
const uuid = z.string().uuid();
type Result = { success: true; periodId?: string } | { success: false; error: string };

function refreshReportPages() {
  revalidatePath("/consultant/monthly-report");
  revalidatePath("/admin/monthly-report");
}

export async function createReportPeriod(formData: FormData): Promise<Result> {
  const viewer = await getActiveSessionProfile();
  if (!viewer) return { success: false, error: "Inicia sesión para crear un período." };
  const role = viewer.user.app_metadata.role;
  if ((role !== "admin" && role !== "consultant") || viewer.profile.role !== role) return { success: false, error: "Acceso denegado." };
  const consultantId = role === "consultant" ? viewer.user.id : formData.get("consultantId");
  const consultant = uuid.safeParse(consultantId);
  const from = date.safeParse(formData.get("from"));
  const to = date.safeParse(formData.get("to"));
  if (!consultant.success || !from.success || !to.success || from.data > to.data) return { success: false, error: "Selecciona un inicio y fin válidos." };

  const { data: periodId, error } = await createAdminSupabaseClient().rpc("create_report_period", {
    p_consultant_user_id: consultant.data,
    p_actor_user_id: viewer.user.id,
    p_start_date: from.data,
    p_end_date: to.data,
  });
  if (error) return { success: false, error: error.message || "No fue posible crear el período." };
  refreshReportPages();
  return { success: true, periodId: typeof periodId === "string" ? periodId : undefined };
}

export async function updateReportPeriod(formData: FormData): Promise<Result> {
  const viewer = await requireRole("admin");
  const period = uuid.safeParse(formData.get("periodId"));
  const from = date.safeParse(formData.get("from"));
  const to = date.safeParse(formData.get("to"));
  if (!period.success || !from.success || !to.success || from.data > to.data) return { success: false, error: "Selecciona un inicio y fin válidos." };

  const { error } = await createAdminSupabaseClient().rpc("update_report_period", {
    p_period_id: period.data,
    p_actor_user_id: viewer.user.id,
    p_start_date: from.data,
    p_end_date: to.data,
  });
  if (error) return { success: false, error: error.message || "No fue posible corregir el período." };
  refreshReportPages();
  return { success: true };
}
