import { describe, it, expect, beforeAll } from "vitest";

// These tests are lightweight contract tests that validate input validation and routing.
// They do not spin up a full server; instead, they validate schemas and basic service behavior
// where possible. For full integration, run the app and use the REST Client examples.

import { createManualSchema, listQuerySchema, updateContentSchema, batchSaveSchema } from "../src/lib/validation/flashcards";

describe("Flashcards validation", () => {
  it("validates list query defaults and bounds", () => {
    const parsed = listQuerySchema.parse({});
    expect(parsed.limit).toBe(25);
    expect(parsed.offset).toBe(0);
    expect(parsed.order).toBe("created_at.desc");

    expect(() => listQuerySchema.parse({ limit: 0 })).toThrow();
    expect(() => listQuerySchema.parse({ limit: 101 })).toThrow();
    expect(() => listQuerySchema.parse({ order: "bad" })).toThrow();
  });

  it("validates create manual payload", () => {
    expect(() => createManualSchema.parse({ front: " ", back: "x" })).toThrow();
    expect(() => createManualSchema.parse({ front: "x", back: " " })).toThrow();
    const ok = createManualSchema.parse({ front: "Q", back: "A" });
    expect(ok.front).toBe("Q");
    expect(ok.back).toBe("A");
  });

  it("validates update content requires at least one field", () => {
    expect(() => updateContentSchema.parse({})).toThrow();
    const ok1 = updateContentSchema.parse({ front: "Q" });
    expect(ok1.front).toBe("Q");
    const ok2 = updateContentSchema.parse({ back: "A" });
    expect(ok2.back).toBe("A");
  });

  it("validates batch save items shape and limits", () => {
    const ok = batchSaveSchema.parse({ items: [{ front: "Q", back: "A", source: "ai" }] });
    expect(ok.items.length).toBe(1);
    expect(() => batchSaveSchema.parse({ items: [] })).toThrow();
    expect(() => batchSaveSchema.parse({ items: Array.from({ length: 101 }, () => ({ front: "Q", back: "A", source: "ai" })) })).toThrow();
  });
});


