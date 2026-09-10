import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getConsultant, listConsultantAttendanceForExport } from "@/lib/admin/consultants";
import { getActiveSessionProfile } from "@/lib/auth/guards";
import { getAttendanceAreaLabel } from "@/lib/attendance/areas";
import { formatMinutesAsHHMM } from "@/lib/attendance/hours";
import { formatLimaDate } from "@/lib/attendance/lima";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const lime = "FF9AAC00";
const paleLime = "FFEAF1D4";
const border = { style: "thin" as const, color: { argb: "FFD0D7DD" } };

function dateRange(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  return datePattern.test(from) && datePattern.test(to) && from <= to ? { from, to } : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActiveSessionProfile();
  if (!session) return Response.json({ error: "No autenticado." }, { status: 401 });
  if (session.user.app_metadata.role !== "admin" || session.profile.role !== "admin") return Response.json({ error: "Acceso denegado." }, { status: 403 });
  const range = dateRange(request);
  if (!range) return Response.json({ error: "Selecciona un rango de fechas válido para generar el Excel." }, { status: 400 });

  const { id } = await params;
  const consultant = await getConsultant(id);
  if (!consultant) return Response.json({ error: "Consultor no encontrado." }, { status: 404 });
  const attendance = await listConsultantAttendanceForExport(consultant.userId, range.from, range.to);
  const totalMinutes = attendance.reduce((sum, item) => sum + (item.declaredMinutes ?? 0), 0);
  const clientLabel = [...new Set(attendance.map((item) => item.clientName).filter((name) => name !== "-"))].join(", ") || consultant.clients.map((client) => client.name).join(", ") || "Sin cliente asignado";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "APM Control";
  workbook.created = new Date();
  const report = workbook.addWorksheet("Reporte de Jornadas", { views: [{ showGridLines: false, state: "frozen", ySplit: 8 }] });
  report.columns = [{ width: 20 }, { width: 19 }, { width: 19 }, { width: 47 }, { width: 21 }];

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "branding", "apm-logo.jpg"));
    const logoId = workbook.addImage({ base64: `data:image/jpeg;base64,${logo.toString("base64")}`, extension: "jpeg" });
    report.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 310, height: 150 } });
  } catch {
    report.getCell("A1").value = "APM GROUP";
    report.getCell("A1").font = { bold: true, size: 24 };
  }
  report.mergeCells("C1:E2"); report.getCell("C1").value = "Reporte de Jornadas del Consultor"; report.getCell("C1").alignment = { vertical: "middle" }; report.getCell("C1").font = { bold: true, size: 22, color: { argb: "FF111111" } };
  report.mergeCells("C3:E3"); report.getCell("C3").value = "EXPERIENCIA QUE GENERA VALOR"; report.getCell("C3").font = { size: 11, color: { argb: "FF727272" }, bold: true }; report.getCell("C3").alignment = { vertical: "middle" };
  report.getRow(1).height = 48; report.getRow(2).height = 44; report.getRow(3).height = 28;
  const summaryRows: Array<[string, string, string, string]> = [["A5", "Nombre del consultor", "B5", consultant.fullName], ["C5", "Total de horas realizadas", "E5", formatMinutesAsHHMM(totalMinutes)], ["A6", "Nombre del cliente", "B6", clientLabel], ["C6", "Total de días trabajados", "E6", String(attendance.length)]];
  for (const [labelCell, label, valueCell, value] of summaryRows) { report.getCell(labelCell).value = label; report.getCell(labelCell).font = { bold: true }; report.getCell(labelCell).fill = { type: "pattern", pattern: "solid", fgColor: { argb: paleLime } }; report.getCell(labelCell).border = { top: border, left: border, bottom: border, right: border }; report.getCell(valueCell).value = value; report.getCell(valueCell).border = { top: border, left: border, bottom: border, right: border }; }
  const headerRow = 8; const headers = ["Fecha", "Hora de ingreso", "Hora de salida", "Áreas con las que se reunió", "Horas realizadas"];
  report.getRow(headerRow).values = headers; report.getRow(headerRow).height = 30;
  report.getRow(headerRow).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lime } }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { top: border, left: border, bottom: border, right: border }; });
  for (const item of attendance) { const row = report.addRow([formatLimaDate(item.workDate), item.entryTime.slice(0, 5), item.exitTime?.slice(0, 5) ?? "-", item.activitySummary.split(", ").map(getAttendanceAreaLabel).join(", ") || "Sin actividades", item.declaredMinutes ? formatMinutesAsHHMM(item.declaredMinutes) : "-"]); row.height = 25; row.eachCell((cell) => { cell.border = { top: border, left: border, bottom: border, right: border }; cell.alignment = { vertical: "middle", wrapText: true }; }); }
  if (!attendance.length) { const row = report.addRow(["Sin asistencias en el rango seleccionado", "", "", "", ""]); report.mergeCells(`A${row.number}:E${row.number}`); row.getCell(1).alignment = { horizontal: "center" }; }
  const totalRow = report.addRow(["TOTAL", "", "", "", formatMinutesAsHHMM(totalMinutes)]); totalRow.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: paleLime } }; cell.font = { bold: true, size: 12 }; cell.border = { top: border, left: border, bottom: border, right: border }; });
  report.autoFilter = { from: `A${headerRow}`, to: `E${Math.max(headerRow + attendance.length, headerRow + 1)}` };

  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [{ width: 30 }, { width: 45 }];
  summary.addRows([["Consultor", consultant.fullName], ["Rango", `${formatLimaDate(range.from)} — ${formatLimaDate(range.to)}`], ["Días trabajados", attendance.length], ["Horas declaradas", formatMinutesAsHHMM(totalMinutes)]]);
  summary.eachRow((row) => { row.getCell(1).font = { bold: true }; row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: paleLime } }; });

  const output = await workbook.xlsx.writeBuffer();
  const safeUsername = consultant.username.replace(/[^a-z0-9._-]/g, "-");
  return new Response(new Uint8Array(output), { headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="asistencias-${safeUsername}-${range.from}-${range.to}.xlsx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
}
