import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildMonthlyWorkbook } from "./monthly-workbook";
import template from "./template-styles.json";

describe("monthly report workbook", () => {
  it("keeps the supplied layout and a SUM formula over declared hours", async () => {
    const logo = await readFile(path.join(process.cwd(), "public", "branding", "apm-report-logo.jpg"));
    const workbook = await buildMonthlyWorkbook({
      from: "2026-11-07", to: "2026-12-07", logo,
      sessions: [
        { work_date: "2026-11-09", daily_summary: "Actividad nueva", declared_minutes: 90, evidence_paths: ["one.jpg", "two.jpg"] },
        { work_date: "2026-11-07", daily_summary: "Actividad previa", declared_minutes: 135, evidence_paths: [] },
      ],
      loadEvidence: async () => ({ bytes: logo, extension: "jpeg" }),
    });
    const bytes = await workbook.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(bytes);
    const sheet = reloaded.getWorksheet("Reporte mensual")!;
    expect(sheet.getColumn("C").width).toBe(template.columns[2]);
    expect(sheet.getRow(2).height).toBe(template.rowHeights.title);
    expect(sheet.getRow(4).height).toBe(template.rowHeights.header);
    expect(sheet.getCell("D2").value).toContain("DEL 7 DE NOVIEMBRE AL 7 DE DICIEMBRE DE 2026");
    expect(sheet.getCell("B4").value).toBe("ACTIVIDAD");
    expect(sheet.getCell("D4").value).toBeNull();
    expect(sheet.getCell("F5").value).toBe(1.5);
    expect(sheet.getCell("F6").value).toBe(2.25);
    expect(sheet.getCell("F8").value).toEqual({ formula: "SUM(F5:F6)", result: 3.75 });
    expect(sheet.getImages()).toHaveLength(3);
    expect(sheet.getImages()[0]?.range.tl.nativeCol).toBe(2);
    expect(sheet.getImages()[1]?.range.tl.nativeColOff).toBe(380000);
    expect(sheet.getImages()[2]?.range.tl.nativeColOff).toBe(6000000);
  });
});
