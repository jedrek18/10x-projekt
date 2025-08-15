import { describe, it, expect } from "vitest";
import { GET as ProgressGET } from "../src/pages/api/progress/index";
import { PATCH as ProgressPATCH } from "../src/pages/api/progress/[date]";

type MockUser = { id: string } | null;

function createMockSupabase(options: {
  user: MockUser;
  progressItems?: any[];
  upsertResult?: any;
}) {
  const auth = {
    async getUser() {
      if (!options.user) return { data: { user: null }, error: new Error("no session") } as any;
      return { data: { user: options.user }, error: null } as any;
    },
  } as const;

  function makeThenable(result: any) {
    return {
      then(onFulfilled: any) {
        return Promise.resolve(result).then(onFulfilled);
      },
    } as any;
  }

  function from(table: string) {
    if (table !== "user_daily_progress") throw new Error("unexpected table: " + table);

    // Query builder for GET
    const queryState: Record<string, any> = { filters: [] };
    const queryBuilder = {
      select() { return queryBuilder; },
      eq(column: string, value: any) { queryState.filters.push(["eq", column, value]); return queryBuilder; },
      gte(column: string, value: any) { queryState.filters.push(["gte", column, value]); return queryBuilder; },
      lte(column: string, value: any) { queryState.filters.push(["lte", column, value]); return queryBuilder; },
      order() { return queryBuilder; },
      // Awaiting the builder should resolve to { data, error }
      then: makeThenable({ data: options.progressItems ?? [], error: null }).then,
    } as any;

    // Upsert builder for PATCH
    const upsertBuilder = {
      select() { return upsertBuilder; },
      async single() {
        if (!options.user) return { data: null, error: new Error("no session") } as any;
        return { data: options.upsertResult ?? null, error: null } as any;
      },
    };

    return {
      select: queryBuilder.select,
      eq: queryBuilder.eq,
      gte: queryBuilder.gte,
      lte: queryBuilder.lte,
      order: queryBuilder.order,
      upsert() { return upsertBuilder; },
    } as any;
  }

  return { auth, from } as any;
}

async function readJson(res: Response): Promise<any> { return await res.json(); }

describe("/api/progress endpoints", () => {
  it("GET 200 returns items for authenticated user", async () => {
    const items = [
      { user_id: "u1", date_utc: "2025-08-13", reviews_done: 1, new_introduced: 0, goal_override: null, created_at: "", updated_at: "" },
    ];
    const supabase = createMockSupabase({ user: { id: "u1" }, progressItems: items });
    const url = new URL("http://localhost/api/progress?date=2025-08-13");
    const res = await ProgressGET({ url, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items.length).toBe(1);
  });

  it("GET 401 when unauthenticated", async () => {
    const supabase = createMockSupabase({ user: null });
    const url = new URL("http://localhost/api/progress?date=2025-08-13");
    const res = await ProgressGET({ url, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });

  it("PATCH 200 updates goal_override for authenticated user", async () => {
    const result = { user_id: "u1", date_utc: "2025-08-13", reviews_done: 0, new_introduced: 0, goal_override: 30, created_at: "", updated_at: "" };
    const supabase = createMockSupabase({ user: { id: "u1" }, upsertResult: result });
    const url = new URL("http://localhost/api/progress/2025-08-13");
    const req = new Request(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_override: 30 }) });
    const res = await ProgressPATCH({ params: { date: "2025-08-13" }, request: req, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.goal_override).toBe(30);
  });

  it("PATCH 422 on invalid body", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" } });
    const url = new URL("http://localhost/api/progress/2025-08-13");
    const req = new Request(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_override: -1 }) });
    const res = await ProgressPATCH({ params: { date: "2025-08-13" }, request: req, locals: { supabase } } as any);
    expect(res.status).toBe(422);
  });

  it("PATCH 400 on invalid date path param", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" } });
    const url = new URL("http://localhost/api/progress/2025-13-40");
    const req = new Request(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_override: 10 }) });
    const res = await ProgressPATCH({ params: { date: "2025-13-40" }, request: req, locals: { supabase } } as any);
    expect(res.status).toBe(400);
  });

  it("PATCH 401 when unauthenticated", async () => {
    const supabase = createMockSupabase({ user: null });
    const url = new URL("http://localhost/api/progress/2025-08-13");
    const req = new Request(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_override: 10 }) });
    const res = await ProgressPATCH({ params: { date: "2025-08-13" }, request: req, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });
});


