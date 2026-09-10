import { describe, expect, it } from "vitest";

import { calculateHoursBetween } from "./hours";

describe("calculateHoursBetween", () => {
  it("propone la diferencia para una jornada histórica", () => {
    expect(calculateHoursBetween("08:00", "17:15")).toBe("09:15");
  });

  it("no propone valores cuando la salida es anterior o falta una hora válida", () => {
    expect(calculateHoursBetween("17:00", "08:00")).toBe("");
    expect(calculateHoursBetween("", "17:00")).toBe("");
  });
});
