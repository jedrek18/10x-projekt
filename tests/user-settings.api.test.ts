import { describe, it, expect } from "vitest";
import { userSettingsPatchSchema } from "../src/lib/validation/user-settings";

describe("/api/user-settings validation", () => {
  it("accepts valid partials", () => {
    expect(() => userSettingsPatchSchema.parse({ daily_goal: 1 })).not.toThrow();
    expect(() => userSettingsPatchSchema.parse({ new_limit: 0 })).not.toThrow();
    expect(() => userSettingsPatchSchema.parse({ daily_goal: 200, new_limit: 50 })).not.toThrow();
  });

  it("requires at least one field", () => {
    expect(() => userSettingsPatchSchema.parse({})).toThrow();
  });

  it("enforces ranges", () => {
    expect(() => userSettingsPatchSchema.parse({ daily_goal: 0 })).toThrow();
    expect(() => userSettingsPatchSchema.parse({ daily_goal: 201 })).toThrow();
    expect(() => userSettingsPatchSchema.parse({ new_limit: -1 })).toThrow();
    expect(() => userSettingsPatchSchema.parse({ new_limit: 51 })).toThrow();
  });
});
