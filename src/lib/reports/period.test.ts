import { describe, expect, it } from "vitest";

import { nextReportDay, reportFileName, reportPeriodLabel } from "./period";

describe("períodos de reporte", () => {
  it("nombra un rango que cruza meses sin asumir el día primero", () => {
    expect(reportFileName("2026-11-15", "2026-12-15")).toBe("Avance del 15 de noviembre al 15 de diciembre de 2026.xlsx");
  });

  it("incluye ambos años cuando el rango los cruza", () => {
    expect(reportPeriodLabel("2026-12-16", "2027-01-16")).toBe("del 16 de diciembre de 2026 al 16 de enero de 2027");
  });

  it("inicia el siguiente período al día posterior incluso en fin de mes", () => {
    expect(nextReportDay("2026-11-30")).toBe("2026-12-01");
    expect(nextReportDay("2028-02-28")).toBe("2028-02-29");
  });
});
