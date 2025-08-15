import { describe, it, expect, vi } from "vitest";
import { GET as UserSettingsGET, PATCH as UserSettingsPATCH } from "../src/pages/api/user-settings";

type MockUser = { id: string } | null;

function createMockSupabase(options: {
  user: MockUser;
  settingsRow?: any;
  insertErrorCode?: string | null;
  makeSelectSinglePending?: boolean;
  updateErrorCode?: string | null;
  makeUpdatePending?: boolean;
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
    if (table !== "user_settings") throw new Error("unexpected table: " + table);

    const selectBuilder = {
      select() { return selectBuilder; },
      eq() { return selectBuilder; },
      single: async () => {
        if (!options.user) return { data: null, error: new Error("no session") } as any;
        if (options.makeSelectSinglePending) return await new Promise(() => {});
        return { data: options.settingsRow ?? { user_id: options.user?.id, daily_goal: 20, new_limit: 10 }, error: null } as any;
      },
      then: options.makeSelectSinglePending
        ? makeThenable(new Promise(() => {})).then
        : makeThenable({ data: options.settingsRow ?? { user_id: options.user?.id, daily_goal: 20, new_limit: 10 }, error: null }).then,
    } as any;

    const insertBuilder = {
      onConflict() { return insertBuilder; },
      ignore() { return { error: options.insertErrorCode ? { code: options.insertErrorCode } : null } as any; },
    } as any;

    const updateBuilder = {
      eq() { return updateBuilder; },
      then: options.makeUpdatePending
        ? makeThenable(new Promise(() => {})).then
        : makeThenable({ error: options.updateErrorCode ? { code: options.updateErrorCode, message: "constraint" } : null }).then,
    } as any;

    return {
      select: selectBuilder.select,
      eq: selectBuilder.eq,
      single: selectBuilder.single,
      insert() { return insertBuilder; },
      onConflict: (insertBuilder as any).onConflict,
      ignore: (insertBuilder as any).ignore,
      update() { return updateBuilder; },
    } as any;
  }

  return { auth, from } as any;
}

async function readJson(res: Response): Promise<any> { return await res.json(); }

describe("/api/user-settings endpoints", () => {
  it("GET 200 returns settings for authenticated user (auto-create)", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null });
    const res = await UserSettingsGET({ locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.user_id).toBe("u1");
  });

  it("GET 401 when unauthenticated", async () => {
    const supabase = createMockSupabase({ user: null, settingsRow: null, insertErrorCode: null });
    const res = await UserSettingsGET({ locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });

  it("PATCH 200 updates settings for authenticated user", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 30, new_limit: 5 }, insertErrorCode: null });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_goal: 30 }) });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.daily_goal).toBe(30);
  });

  it("PATCH 415 when content type is not JSON", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH" });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(415);
  });

  it("PATCH 400 on invalid JSON", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{" as any });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(400);
  });

  it("PATCH 422 on validation errors", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_goal: 0 }) });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(422);
  });

  it("PATCH 401 when unauthenticated", async () => {
    const supabase = createMockSupabase({ user: null, settingsRow: null, insertErrorCode: null });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_goal: 30 }) });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });

  it("GET 408 on timeout", async () => {
    vi.useFakeTimers();
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: null, insertErrorCode: null, makeSelectSinglePending: true });
    const resPromise = UserSettingsGET({ locals: { supabase } } as any);
    await vi.advanceTimersByTimeAsync(10000);
    const res = await resPromise;
    expect(res.status).toBe(408);
    vi.useRealTimers();
  });

  it("PATCH 408 on timeout", async () => {
    vi.useFakeTimers();
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null, makeUpdatePending: true });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_goal: 30 }) });
    const resPromise = UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    await vi.advanceTimersByTimeAsync(10000);
    const res = await resPromise;
    expect(res.status).toBe(408);
    vi.useRealTimers();
  });

  it("PATCH 422 on DB constraint violation", async () => {
    const supabase = createMockSupabase({ user: { id: "u1" }, settingsRow: { user_id: "u1", daily_goal: 20, new_limit: 10 }, insertErrorCode: null, updateErrorCode: "23514" });
    const req = new Request("http://localhost/api/user-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ daily_goal: 9999 }) });
    const res = await UserSettingsPATCH({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(422);
  });
});


