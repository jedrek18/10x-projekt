import { describe, it, expect } from "vitest";
import { reviewCard } from "../src/lib/services/srs.service";

function createMockSupabaseReview(options: { userId: string; card: any; progress?: { reviews_done?: number } | null }) {
  const state: any = {
    card: options.card,
    progress: options.progress ?? { reviews_done: 0 },
  };

  const auth = {
    async getUser() {
      return { data: { user: { id: options.userId } }, error: null } as any;
    },
  } as const;

  function from(table: string) {
    const chain: any = {
      _table: table,
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      is() {
        return chain;
      },
      update(vals?: any) {
        chain._updateVals = vals;
        return chain;
      },
      async maybeSingle() {
        if (table === "flashcards") return { data: state.card, error: null } as any;
        if (table === "user_daily_progress") return { data: state.progress, error: null } as any;
        return { data: null, error: null } as any;
      },
      then(onFulfilled: any) {
        return Promise.resolve({ data: [], error: null }).then(onFulfilled);
      },
    };
    return chain as any;
  }

  return { auth, from } as any;
}

describe("reviewCard algorithm", () => {
  it("rating=0 sets relearning and short due", async () => {
    const now = Date.now();
    const supabase = createMockSupabaseReview({
      userId: "u1",
      card: { id: "c1", state: "review", due_at: null, interval_days: 5, ease_factor: 2.5, reps: 10, lapses: 0 },
    });
    const res = await reviewCard(supabase as any, { card_id: "c1", rating: 0 });
    expect(res.state).toBe("relearning");
    expect(res.interval_days).toBe(0);
    expect(res.ease_factor).toBeGreaterThanOrEqual(1.3);
    expect(new Date(res.due_at!).getTime()).toBeGreaterThan(now);
    expect(new Date(res.due_at!).getTime()).toBeLessThan(now + 20 * 60 * 1000);
  });

  it("rating=1 moves to learning with ~1 day due", async () => {
    const now = Date.now();
    const supabase = createMockSupabaseReview({
      userId: "u1",
      card: { id: "c1", state: "new", interval_days: 0, ease_factor: 2.5, reps: 0, lapses: 0 },
    });
    const res = await reviewCard(supabase as any, { card_id: "c1", rating: 1 });
    expect(res.state).toBe("learning");
    expect(new Date(res.due_at!).getTime()).toBeGreaterThan(now + 12 * 60 * 60 * 1000);
    expect(new Date(res.due_at!).getTime()).toBeLessThan(now + 2 * 24 * 60 * 60 * 1000);
  });

  it("rating=2 sets review and increases interval with min 1", async () => {
    const supabase = createMockSupabaseReview({
      userId: "u1",
      card: { id: "c1", state: "learning", interval_days: 0, ease_factor: 2.5, reps: 1, lapses: 0 },
    });
    const res = await reviewCard(supabase as any, { card_id: "c1", rating: 2 });
    expect(res.state).toBe("review");
    expect(res.interval_days).toBeGreaterThanOrEqual(1);
    expect(res.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  it("rating=3 sets review and grows interval and ease", async () => {
    const supabase = createMockSupabaseReview({
      userId: "u1",
      card: { id: "c1", state: "review", interval_days: 2, ease_factor: 2.3, reps: 3, lapses: 0 },
    });
    const res = await reviewCard(supabase as any, { card_id: "c1", rating: 3 });
    expect(res.state).toBe("review");
    expect(res.interval_days).toBeGreaterThanOrEqual(2);
    expect(res.ease_factor).toBeGreaterThanOrEqual(1.3);
  });
});
