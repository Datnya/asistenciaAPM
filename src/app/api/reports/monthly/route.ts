import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getActiveSessionProfile } from "@/lib/auth/guards";
import { reportFileName, reportPeriodLabel } from "@/lib/reports/period";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ATTENDANCE_EVIDENCE_BUCKET } from "@/lib/supabase/attendance-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const border: ExcelJS.Border = { style: "thin", color: { argb: "FFB9BFC4" } };

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
  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", consultantId).eq("role", "consultant").maybeSingle();
  if (!profile) return Response.json({ error: "Consultor no encontrado." }, { status: 404 });
  const from = period.start_date;
  const to = period.end_date;
  const { data: sessions, error } = await admin.from("attendance_sessions").select("work_date, daily_summary, declared_minutes, evidence_paths").eq("consultant_user_id", consultantId).eq("status", "closed").gte("work_date", from).lte("work_date", to).order("work_date", { ascending: false });
  if (error) return Response.json({ error: "No fue posible cargar las jornadas." }, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "APM Control";
  const sheet = workbook.addWorksheet("Reporte mensual", { views: [{ showGridLines: false, state: "frozen", ySplit: 4 }] });
  sheet.columns = [{ width: 3 }, { width: 7 }, { width: 74 }, { width: 19 }, { width: 19 }, { width: 16 }, { width: 58 }];
  sheet.getRow(2).height = 108;
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "branding", "apm-logo.jpg"));
    const logoId = workbook.addImage({ base64: logo.toString("base64"), extension: "jpeg" });
    sheet.addImage(logoId, { tl: { col: 1, row: 1 }, ext: { width: 165, height: 83 } });
  } catch { sheet.getCell("B2").value = "APM GROUP"; }
  sheet.mergeCells("C2:G2");
  const title = sheet.getCell("C2");
  title.value = `AVANCE EN EL MONITOREO Y SEGUIMIENTO AL SISTEMA INTEGRADO DE GESTIÓN\n${reportPeriodLabel(from, to).toUpperCase()}`;
  title.font = { name: "Arial", size: 20, bold: true, color: { argb: "FF111111" } };
  title.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  sheet.mergeCells("B3:G3");
  sheet.getCell("B3").value = `${profile.first_name} ${profile.last_name} · ${reportPeriodLabel(from, to)}`;
  sheet.getCell("B3").font = { name: "Arial", size: 11, color: { argb: "FF4B5563" } };
  sheet.getRow(3).height = 24;
  sheet.getRow(4).values = [null, "N.º", "ACTIVIDAD", "DÍA", "FECHA", "HORAS", "EVIDENCIA"];
  sheet.getRow(4).height = 34;
  sheet.getRow(4).eachCell((cell, column) => { if (column < 2) return; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0BF12" } }; cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF111111" } }; cell.alignment = { horizontal: "center", vertical: "middle" }; cell.border = { top: border, bottom: border, left: border, right: border }; });
  let totalMinutes = 0;
  for (const [index, item] of (sessions ?? []).entries()) {
    const rowNumber = index + 5;
    const row = sheet.getRow(rowNumber);
    row.height = 170;
    const date = new Date(`${item.work_date}T12:00:00-05:00`);
    row.getCell(2).value = index + 1;
    row.getCell(3).value = item.daily_summary || "Sin actividad general registrada";
    row.getCell(4).value = new Intl.DateTimeFormat("es-PE", { weekday: "long", timeZone: "America/Lima" }).format(date);
    row.getCell(5).value = date;
    row.getCell(5).numFmt = "dd/mm/yyyy";
    row.getCell(6).value = (item.declared_minutes ?? 0) / 60;
    row.getCell(6).numFmt = "0.00";
    totalMinutes += item.declared_minutes ?? 0;
    for (let column = 2; column <= 7; column++) { const cell = row.getCell(column); cell.border = { top: border, bottom: border, left: border, right: border }; cell.alignment = { vertical: "middle", horizontal: column === 3 ? "left" : "center", wrapText: true }; cell.font = { name: "Arial", size: 11 }; }
    const paths: string[] = Array.isArray(item.evidence_paths) ? item.evidence_paths.slice(0, 2) : [];
    for (const [imageIndex, evidencePath] of paths.entries()) {
      if (!evidencePath.startsWith(`${consultantId}/`)) continue;
      const { data: file } = await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).download(evidencePath);
      if (!file) continue;
      const bytes = Buffer.from(await file.arrayBuffer());
      const extension = evidencePath.endsWith(".png") ? "png" : "jpeg";
      const imageId = workbook.addImage({ base64: bytes.toString("base64"), extension });
      sheet.addImage(imageId, { tl: { col: 6 + imageIndex * 0.5, row: rowNumber - 1 + 0.08 }, ext: { width: 174, height: 205 } });
    }
  }
  const totalRow = sheet.getRow((sessions?.length ?? 0) + 5);
  totalRow.getCell(5).value = "TOTAL";
  totalRow.getCell(6).value = totalMinutes / 60;
  totalRow.getCell(6).numFmt = "0.00";
  totalRow.height = 32;
  for (let column = 2; column <= 7; column++) { const cell = totalRow.getCell(column); cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF1D4" } }; cell.font = { bold: true }; cell.border = { top: border, bottom: border, left: border, right: border }; }
  const output = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(output), { headers: { "Cache-Control": "no-store", "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="Avance_${from}_${to}.xlsx"; filename*=UTF-8''${encodeURIComponent(reportFileName(from, to))}` } });
}
