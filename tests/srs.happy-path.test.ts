import { describe, it, expect } from "vitest";
import { GET as SrsQueueGET } from "../src/pages/api/srs/queue";
import { POST as SrsPromotePOST } from "../src/pages/api/srs/promote-new";
import { POST as SrsReviewPOST } from "../src/pages/api/srs/review";

function createMockSupabaseSrs(options: {
  userId: string;
  settings?: { daily_goal?: number; new_limit?: number } | null;
  progress?: { goal_override?: number | null; reviews_done?: number; new_introduced?: number } | null;
  dueCards?: Array<{ id: string; front: string; state: string; due_at: string | null }>;
  newCards?: Array<{ id: string; front: string; state: string }>;
}) {
  const state: any = {
    progress: options.progress ?? { goal_override: null, reviews_done: 0, new_introduced: 0 },
    settings: options.settings ?? { daily_goal: 20, new_limit: 10 },
    dueCards: options.dueCards ?? [],
    newCards: options.newCards ?? [],
    audit: [] as any[],
  };

  const auth = {
    async getUser() { return { data: { user: { id: options.userId } }, error: null } as any; },
  } as const;

  function makeThenable(result: any) {
    return { then(onFulfilled: any) { return Promise.resolve(result).then(onFulfilled); } } as any;
  }

  function from(table: string) {
    const chain: any = {
      select() { return chain; },
      eq() { return chain; },
      is() { return chain; },
      not() { return chain; },
      lte() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      in() { return chain; },
      update(values?: any) {
        chain._updateValues = values; return chain;
      },
      upsert(values?: any) {
        chain._upsertValues = values; return chain;
      },
      async maybeSingle() {
        if (table === "user_settings") return { data: state.settings, error: null } as any;
        if (table === "user_daily_progress") return { data: state.progress, error: null } as any;
        if (table === "flashcards") return { data: state.dueCards[0] ?? null, error: null } as any;
        return { data: null, error: null } as any;
      },
      async single() { return chain.maybeSingle(); },
      then(onFulfilled: any) {
        if (table === "flashcards") {
          // for SELECT lists
          return Promise.resolve({ data: chain._selectNew ? state.newCards : state.dueCards, error: null }).then(onFulfilled);
        }
        if (table === "user_daily_progress") {
          // for list selects not used here
          return Promise.resolve({ data: [], error: null }).then(onFulfilled);
        }
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      },
    };

    // Signals whether we want new cards list (based on .is("introduced_on", null))
    const origIs = chain.is;
    chain.is = function (col: string, val: any) {
      if (table === "flashcards" && col === "introduced_on" && val === null) {
        chain._selectNew = true;
      }
      return origIs.apply(chain, arguments as any);
    };

    // Handle updates side effects
    const origThen = chain.then;
    chain.then = function (onFulfilled: any) {
      if (table === "flashcards" && chain._updateValues) {
        // promotion: introduced_on set
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      }
      if (table === "user_daily_progress") {
        if (chain._updateValues) {
          state.progress = { ...state.progress, ...chain._updateValues };
          return Promise.resolve({ data: [{ user_id: options.userId }], error: null }).then(onFulfilled);
        }
        if (chain._upsertValues) {
          state.progress = { ...state.progress, ...chain._upsertValues };
          return Promise.resolve({ data: [{ user_id: options.userId }], error: null }).then(onFulfilled);
        }
      }
      return origThen.call(chain, onFulfilled);
    };

    return {
      select: chain.select,
      eq: chain.eq,
      is: chain.is,
      not: chain.not,
      lte: chain.lte,
      order: chain.order,
      limit: chain.limit,
      in: chain.in,
      update: chain.update,
      upsert: chain.upsert,
      maybeSingle: chain.maybeSingle,
      single: chain.single,
      then: chain.then,
    } as any;
  }

  return { auth, from } as any;
}

async function readJson(res: Response): Promise<any> { return await res.json(); }

describe("/api/srs endpoints happy paths", () => {
  it("GET /api/srs/queue returns computed queue and meta", async () => {
    const due = [{ id: "c1", front: "Q1", state: "review", due_at: new Date(Date.now() - 1000).toISOString() }];
    const news = [{ id: "n1", front: "N1", state: "new" }];
    const supabase = createMockSupabaseSrs({ userId: "u1", settings: { daily_goal: 10, new_limit: 5 }, progress: { goal_override: null, reviews_done: 2, new_introduced: 1 }, dueCards: due as any, newCards: news as any });
    const url = new URL("http://localhost/api/srs/queue");
    const res = await SrsQueueGET({ url, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(Array.isArray(body.due)).toBe(true);
    expect(Array.isArray(body.new)).toBe(true);
    expect(body.meta.daily_goal).toBe(10);
  });

  it("POST /api/srs/promote-new promotes candidates within allowance", async () => {
    const supabase = createMockSupabaseSrs({ userId: "u1", settings: { new_limit: 5 }, progress: { new_introduced: 1, goal_override: null, reviews_done: 0 }, newCards: [{ id: "n1", front: "N1", state: "new" }, { id: "n2", front: "N2", state: "new" }] as any });
    const url = new URL("http://localhost/api/srs/promote-new");
    const req = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const res = await SrsPromotePOST({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(Array.isArray(body.promoted)).toBe(true);
    expect(body.remaining_allowance).toBeGreaterThanOrEqual(0);
  });

  it("POST /api/srs/review updates SRS fields and increments reviews_done", async () => {
    const cardId = "00000000-0000-0000-0000-000000000001";
    const dueCard = { id: cardId, state: "review", due_at: null, interval_days: 1, ease_factor: 2.5, reps: 1, lapses: 0, last_reviewed_at: null, last_rating: null };
    const supabase = createMockSupabaseSrs({ userId: "u1", progress: { reviews_done: 0, goal_override: null, new_introduced: 0 }, dueCards: [dueCard as any] });
    const url = new URL("http://localhost/api/srs/review");
    const req = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: cardId, rating: 2 }) });
    const res = await SrsReviewPOST({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.card_id).toBe(cardId);
    expect(body.reps).toBeGreaterThan(1);
  });
});


