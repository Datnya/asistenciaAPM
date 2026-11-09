import { describe, expect, it } from "vitest";

import { clampEvidencePan } from "./evidence-pan";

describe("evidence pan", () => {
  it("keeps a non-zoomed image centered", () => {
    expect(clampEvidencePan({ width: 800, height: 600 }, { width: 1200, height: 600 }, 1, 400, -300)).toEqual({ x: 0, y: 0 });
  });

  it("allows dragging to each visible edge after zoom", () => {
    const stage = { width: 800, height: 600 };
    const image = { width: 1200, height: 600 };
    expect(clampEvidencePan(stage, image, 2, 999, 999)).toEqual({ x: 400, y: 100 });
    expect(clampEvidencePan(stage, image, 2, -999, -999)).toEqual({ x: -400, y: -100 });
  });
});
