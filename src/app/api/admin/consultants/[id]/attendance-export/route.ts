import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getConsultant } from "@/lib/admin/consultants";
import { getActiveSessionProfile } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getActiveSessionProfile();
  if (!session) return Response.json({ error: "No autenticado." }, { status: 401 });
  if (session.user.app_metadata.role !== "admin" || session.profile.role !== "admin") {
    return Response.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const { id } = await params;
  const consultant = await getConsultant(id);
  if (!consultant) return Response.json({ error: "Consultor no encontrado." }, { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "APM Control";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 6 }] });
  summary.columns = [{ width: 26 }, { width: 44 }, { width: 22 }];

  try {
    const logo = await readFile(path.join(process.cwd(), "public", "branding", "apm-logo.jpg"));
    const logoId = workbook.addImage({
      base64: `data:image/jpeg;base64,${logo.toString("base64")}`,
      extension: "jpeg",
    });
    summary.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 150, height: 75 } });
    summary.getRow(1).height = 60;
  } catch {
    summary.getCell("A1").value = "APM Group";
  }

  summary.mergeCells("A3:C3");
  summary.getCell("A3").value = "Reporte de asistencia";
  summary.getCell("A3").font = { bold: true, size: 20, color: { argb: "FF000000" } };
  summary.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0BF12" } };
  summary.getCell("A5").value = "Consultor";
  summary.getCell("B5").value = consultant.fullName;
  summary.getCell("A6").value = "DNI";
  summary.getCell("B6").value = consultant.dni ?? "No registrado";
  summary.getCell("A7").value = "Clientes asignados";
  summary.getCell("B7").value = consultant.clients.map((client) => client.name).join(", ") || "Sin cliente asignado";
  summary.getCell("A9").value = "Días con asistencia";
  summary.getCell("B9").value = 0;
  summary.getCell("A10").value = "Horas declaradas";
  summary.getCell("B10").value = "0 h 00 min";
  summary.getCell("A12").value = "Este consultor todavía no tiene asistencias registradas.";
  summary.mergeCells("A12:C12");

  for (const row of [5, 6, 7, 9, 10]) summary.getCell(`A${row}`).font = { bold: true };

  const detail = workbook.addWorksheet("Detalle", { views: [{ state: "frozen", ySplit: 1 }] });
  detail.columns = [
    { header: "Fecha", key: "date", width: 16 },
    { header: "Consultor", key: "consultant", width: 28 },
    { header: "Cliente", key: "client", width: 30 },
    { header: "Hora ingreso", key: "entry", width: 16 },
    { header: "Hora salida", key: "exit", width: 16 },
    { header: "Horas declaradas", key: "hours", width: 20 },
    { header: "Estado", key: "status", width: 16 },
  ];
  detail.getRow(1).font = { bold: true, color: { argb: "FF000000" } };
  detail.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB0BF12" } };
  detail.autoFilter = { from: "A1", to: "G1" };
  detail.addRow({ consultant: "Sin asistencias registradas" });

  const output = await workbook.xlsx.writeBuffer();
  const safeUsername = consultant.username.replace(/[^a-z0-9._-]/g, "-");
  return new Response(new Uint8Array(output), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="asistencias-${safeUsername}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
