import { describe, it, expect } from "vitest";
import { dateSchema, getQuerySchema, patchBodySchema } from "../src/lib/validation/progress.schemas";

describe("Progress validation", () => {
  it("validates date format and calendar correctness", () => {
    expect(() => dateSchema.parse("2025-02-29")) .toThrow();
    expect(dateSchema.parse("2025-08-13")).toBe("2025-08-13");
  });

  it("validates get query single-date and range, with range bounds and limit", () => {
    const single = getQuerySchema.parse({ date: "2025-08-13" });
    expect("date" in single).toBe(true);

    const range = getQuerySchema.parse({ start: "2025-08-01", end: "2025-08-13" });
    expect("start" in range && "end" in range).toBe(true);

    expect(() => getQuerySchema.parse({ start: "2025-08-14", end: "2025-08-13" })).toThrow();
  });

  it("validates patch body goal_override int >= 0 or null", () => {
    expect(patchBodySchema.parse({ goal_override: 0 }).goal_override).toBe(0);
    expect(patchBodySchema.parse({ goal_override: null }).goal_override).toBe(null);
    expect(() => patchBodySchema.parse({ goal_override: -1 })).toThrow();
    expect(() => patchBodySchema.parse({})).toThrow();
  });
});


