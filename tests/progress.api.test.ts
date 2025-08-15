import { describe, it, expect } from "vitest";
import { getQuerySchema, patchBodySchema, dateSchema } from "../src/lib/validation/progress.schemas";

describe("/api/progress contract", () => {
  it("GET schema supports either single date or range", () => {
    expect(() => getQuerySchema.parse({ date: "2025-08-13" })).not.toThrow();
    expect(() => getQuerySchema.parse({ start: "2025-08-01", end: "2025-08-13" })).not.toThrow();
  });

  it("PATCH schema and param validators work", () => {
    expect(() => dateSchema.parse("2025-08-13")).not.toThrow();
    expect(() => patchBodySchema.parse({ goal_override: 10 })).not.toThrow();
    expect(() => patchBodySchema.parse({ goal_override: null })).not.toThrow();
  });
});


