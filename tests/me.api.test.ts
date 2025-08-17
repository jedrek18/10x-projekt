import { describe, it, expect } from "vitest";
import { profileUpdateCommandSchema } from "../src/lib/validation/profile";

describe("/api/me validation", () => {
  it("accepts empty object for PATCH (MVP)", () => {
    const parsed = profileUpdateCommandSchema.parse({});
    expect(parsed).toEqual({});
  });

  it("rejects unknown fields due to .strict()", () => {
    expect(() => profileUpdateCommandSchema.parse({ is_admin: true })).toThrow();
    expect(() => profileUpdateCommandSchema.parse({ any: "value" })).toThrow();
  });
});
