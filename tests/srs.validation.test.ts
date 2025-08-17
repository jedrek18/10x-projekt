import { describe, it, expect } from "vitest";
import { queueQuerySchema, promoteNewSchema, reviewSchema } from "../src/lib/validation/srs";

describe("SRS validation", () => {
  it("validates queue query goal_hint optional and bounded", () => {
    const ok1 = queueQuerySchema.parse({});
    expect(ok1.goal_hint).toBeUndefined();
    const ok2 = queueQuerySchema.parse({ goal_hint: "5" as any });
    expect(ok2.goal_hint).toBe(5);
    expect(() => queueQuerySchema.parse({ goal_hint: 0 })).toThrow();
    expect(() => queueQuerySchema.parse({ goal_hint: 1001 })).toThrow();
  });

  it("validates promote new count bounds", () => {
    const ok = promoteNewSchema.parse({ count: "3" as any });
    expect(ok.count).toBe(3);
    expect(() => promoteNewSchema.parse({ count: -1 })).toThrow();
    expect(() => promoteNewSchema.parse({ count: 101 })).toThrow();
    const optional = promoteNewSchema.parse({});
    expect(optional.count).toBeUndefined();
  });

  it("validates review payload", () => {
    const id = "00000000-0000-0000-0000-000000000000";
    const ok = reviewSchema.parse({ card_id: id, rating: 2 });
    expect(ok.card_id).toBe(id);
    expect(() => reviewSchema.parse({ card_id: id, rating: 4 })).toThrow();
    expect(() => reviewSchema.parse({ card_id: "not-uuid", rating: 1 })).toThrow();
  });
});
