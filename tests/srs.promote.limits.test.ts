import { describe, it, expect } from "vitest";
import { POST as SrsPromotePOST } from "../src/pages/api/srs/promote-new";

function createMockSupabasePromote(options: {
  userId: string;
  newLimit: number;
  introduced: number;
  candidates: string[];
}) {
  const state: any = {
    settings: { new_limit: options.newLimit },
    progress: { new_introduced: options.introduced },
    candidates: options.candidates.map((id) => ({ id })),
    profile: { user_id: options.userId, is_admin: false, created_at: new Date().toISOString() },
  };
  const auth = {
    async getUser() {
      return { data: { user: { id: options.userId } }, error: null } as any;
    },
  } as const;
  function from(table: string) {
    const chain: any = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      is() {
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      in() {
        return chain;
      },
      update() {
        return chain;
      },
      upsert() {
        return chain;
      },
      insert() {
        return chain;
      },
      async maybeSingle() {
        if (table === "user_settings") return { data: state.settings, error: null } as any;
        if (table === "user_daily_progress") return { data: state.progress, error: null } as any;
        if (table === "profiles") return { data: state.profile, error: null } as any;
        if (table === "app_errors") return { data: null, error: null } as any;
        return { data: null, error: null } as any;
      },
      async single() {
        return chain.maybeSingle();
      },
      then(onFulfilled: any) {
        if (table === "flashcards") return Promise.resolve({ data: state.candidates, error: null }).then(onFulfilled);
        if (table === "profiles") return Promise.resolve({ data: state.profile, error: null }).then(onFulfilled);
        if (table === "app_errors") return Promise.resolve({ data: [], error: null }).then(onFulfilled);
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      },
    };
    return chain as any;
  }

  // Add RPC method
  const rpc = async (functionName: string, params: any) => {
    return { data: null, error: null } as any;
  };

  return { auth, from, rpc } as any;
}

async function readJson(res: Response): Promise<any> {
  return await res.json();
}

describe("promote-new limits", () => {
  it("returns empty when no allowance left", async () => {
    const supabase = createMockSupabasePromote({ userId: "u1", newLimit: 3, introduced: 3, candidates: ["c1", "c2"] });
    const url = new URL("http://localhost/api/srs/promote-new");
    const req = new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 }),
    });
    const res = await SrsPromotePOST({ request: req, locals: { supabase } } as any);
    const body = await readJson(res);
    expect(body.promoted.length).toBe(0);
    expect(body.remaining_allowance).toBe(0);
  });

  it("caps by soft per-day cap and remaining allowance", async () => {
    const supabase = createMockSupabasePromote({
      userId: "u1",
      newLimit: 10,
      introduced: 2,
      candidates: ["c1", "c2", "c3", "c4", "c5", "c6"],
    });
    const url = new URL("http://localhost/api/srs/promote-new");
    const req = new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 100 }),
    });
    const res = await SrsPromotePOST({ request: req, locals: { supabase } } as any);
    const body = await readJson(res);
    expect(body.promoted.length).toBeGreaterThan(0);
    expect(body.remaining_allowance).toBeGreaterThanOrEqual(0);
  });

  it("returns empty when no candidates", async () => {
    const supabase = createMockSupabasePromote({ userId: "u1", newLimit: 5, introduced: 0, candidates: [] });
    const url = new URL("http://localhost/api/srs/promote-new");
    const req = new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await SrsPromotePOST({ request: req, locals: { supabase } } as any);
    const body = await readJson(res);
    expect(body.promoted.length).toBe(0);
  });
});
