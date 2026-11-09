import ExcelJS from "exceljs";

import { reportPeriodLabel } from "./period";
import template from "./template-styles.json";

export type ReportSession = {
  work_date: string;
  daily_summary: string | null;
  declared_minutes: number | null;
  evidence_paths: string[] | null;
};

type Evidence = { bytes: Buffer; extension: "jpeg" | "png" };

function imageSize(bytes: Buffer, extension: Evidence["extension"]) {
  if (extension === "png" && bytes.length >= 24) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (extension === "jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      const marker = bytes[offset + 1];
      if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
  }
  return { width: 1, height: 1 };
}

function applyStyle(cell: ExcelJS.Cell, style: object) {
  cell.style = structuredClone(style) as ExcelJS.Style;
}

export async function buildMonthlyWorkbook({ from, to, sessions, logo, loadEvidence }: {
  from: string;
  to: string;
  sessions: ReportSession[];
  logo: Buffer;
  loadEvidence: (path: string) => Promise<Evidence | null>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "APM Control";
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Reporte mensual", { views: [{ showGridLines: true, zoomScale: 50 }] });
  template.columns.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.getRow(1).height = template.rowHeights.top;
  sheet.getRow(2).height = template.rowHeights.title;
  sheet.getRow(3).height = template.rowHeights.gap;
  sheet.getRow(4).height = template.rowHeights.header;

  // La imagen original queda dentro de C2; el título empieza en D2.
  const logoId = workbook.addImage({ base64: logo.toString("base64"), extension: "jpeg" });
  sheet.addImage(logoId, { tl: { col: 2, row: 1 }, ext: { width: 317.5, height: 148.25 } });
  const logoAnchor = sheet.getImages()[0]?.range.tl;
  if (logoAnchor) {
    logoAnchor.nativeColOff = 1381760;
    logoAnchor.nativeRowOff = 213360;
  }
  sheet.mergeCells("D2:G2");
  for (const col of ["B", "C", "D", "E", "F", "G"] as const) applyStyle(sheet.getCell(`${col}2`), template.styles.title[col]);
  sheet.getCell("D2").value = `AVANCE EN EL MONITOREO Y SEGUIMIENTO AL SISTEMA INTEGRADO DE GESTIÓN\n- ${reportPeriodLabel(from, to).toUpperCase()}`;

  sheet.mergeCells("B4:C4");
  for (const col of ["B", "C", "D", "E", "F", "G"] as const) applyStyle(sheet.getCell(`${col}4`), template.styles.header[col]);
  sheet.getCell("B4").value = "ACTIVIDAD";
  sheet.getCell("E4").value = "DÍAS";
  sheet.getCell("F4").value = "HORAS";
  sheet.getCell("G4").value = "EVIDENCIA";

  let totalMinutes = 0;
  for (const [index, item] of sessions.entries()) {
    const rowNumber = index + 5;
    const row = sheet.getRow(rowNumber);
    row.height = template.rowHeights.body;
    for (const col of ["B", "C", "D", "E", "F", "G"] as const) applyStyle(row.getCell(col), template.styles.body[col]);
    const date = new Date(`${item.work_date}T12:00:00-05:00`);
    row.getCell("B").value = index + 1;
    row.getCell("C").value = item.daily_summary || "Sin actividad general registrada";
    row.getCell("D").value = new Intl.DateTimeFormat("es-PE", { weekday: "long", timeZone: "America/Lima" }).format(date);
    row.getCell("E").value = date;
    row.getCell("F").value = (item.declared_minutes ?? 0) / 60;
    totalMinutes += item.declared_minutes ?? 0;

    const paths = Array.isArray(item.evidence_paths) ? item.evidence_paths.slice(0, 2) : [];
    for (const [imageIndex, evidencePath] of paths.entries()) {
      const evidence = await loadEvidence(evidencePath);
      if (!evidence) continue;
      const dimensions = imageSize(evidence.bytes, evidence.extension);
      const scale = Math.min(520 / dimensions.width, 370 / dimensions.height);
      const width = Math.round(dimensions.width * scale);
      const height = Math.round(dimensions.height * scale);
      const imageId = workbook.addImage({ base64: evidence.bytes.toString("base64"), extension: evidence.extension });
      sheet.addImage(imageId, { tl: { col: 6, row: rowNumber - 1 }, ext: { width, height } });
      const anchor = sheet.getImages().at(-1)?.range.tl;
      if (anchor) {
        anchor.nativeColOff = imageIndex === 0 ? 380000 : 6000000;
        anchor.nativeRowOff = 95250;
      }
    }
  }

  const spacerRow = sessions.length + 5;
  sheet.getRow(spacerRow).height = template.rowHeights.spacer;
  const totalRowNumber = spacerRow + 1;
  const totalRow = sheet.getRow(totalRowNumber);
  totalRow.height = template.rowHeights.total;
  sheet.mergeCells(`D${totalRowNumber}:E${totalRowNumber}`);
  for (const col of ["B", "C", "D", "E", "F", "G"] as const) applyStyle(totalRow.getCell(col), template.styles.total[col]);
  totalRow.getCell("D").value = "TOTAL";
  totalRow.getCell("F").value = { formula: `SUM(F5:F${Math.max(5, totalRowNumber - 2)})`, result: totalMinutes / 60 };
  return workbook;
}
