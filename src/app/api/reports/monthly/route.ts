import { readFile } from "node:fs/promises";
import path from "node:path";

import { getActiveSessionProfile } from "@/lib/auth/guards";
import { buildMonthlyWorkbook } from "@/lib/reports/monthly-workbook";
import { reportFileName } from "@/lib/reports/period";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ATTENDANCE_EVIDENCE_BUCKET } from "@/lib/supabase/attendance-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getActiveSessionProfile();
  if (!session) return Response.json({ error: "No autenticado." }, { status: 401 });
  const role = session.user.app_metadata.role;
  if (role !== "admin" && role !== "consultant" || session.profile.role !== role) return Response.json({ error: "Acceso denegado." }, { status: 403 });
  const url = new URL(request.url);
  const periodId = url.searchParams.get("period");
  if (!periodId || !/^[0-9a-f-]{36}$/i.test(periodId)) return Response.json({ error: "Selecciona un período válido." }, { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data: period, error: periodError } = await admin.from("report_periods").select("consultant_user_id, start_date, end_date").eq("id", periodId).maybeSingle();
  if (periodError || !period) return Response.json({ error: "Período no encontrado." }, { status: 404 });
  const consultantId = period.consultant_user_id;
  if (role === "consultant" && consultantId !== session.user.id) return Response.json({ error: "Acceso denegado." }, { status: 403 });
  const { data: profile } = await admin.from("profiles").select("user_id").eq("user_id", consultantId).eq("role", "consultant").maybeSingle();
  if (!profile) return Response.json({ error: "Consultor no encontrado." }, { status: 404 });
  const from = period.start_date;
  const to = period.end_date;
  const { data: sessions, error } = await admin.from("attendance_sessions").select("work_date, daily_summary, declared_minutes, evidence_paths").eq("consultant_user_id", consultantId).eq("status", "closed").gte("work_date", from).lte("work_date", to).order("work_date", { ascending: false });
  if (error) return Response.json({ error: "No fue posible cargar las jornadas." }, { status: 500 });

  const logo = await readFile(path.join(process.cwd(), "public", "branding", "apm-report-logo.jpg"));
  const workbook = await buildMonthlyWorkbook({
    from, to, sessions: sessions ?? [], logo,
    loadEvidence: async (evidencePath) => {
      if (!evidencePath.startsWith(`${consultantId}/`)) return null;
      const { data: file } = await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).download(evidencePath);
      if (!file) return null;
      return { bytes: Buffer.from(await file.arrayBuffer()), extension: evidencePath.endsWith(".png") ? "png" as const : "jpeg" as const };
    },
  });
  const output = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(output), { headers: { "Cache-Control": "no-store", "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Avance_${from}_${to}.xlsx"; filename*=UTF-8''${encodeURIComponent(reportFileName(from, to))}` } });
}
