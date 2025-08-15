import { describe, it, expect } from "vitest";
import { getCurrentProfile, NotFoundError } from "../src/lib/services/profile.service";
import { UnauthorizedError } from "../src/lib/services/ai.service";

function createMockSupabase(opts: {
  authUser?: { id: string } | null;
  profileRow?: { user_id: string; is_admin: boolean; created_at: string } | null;
  selectError?: boolean;
}) {
  const supabase: any = {
    auth: {
      async getUser() {
        if (!opts.authUser) return { data: { user: null }, error: new Error("no session") };
        return { data: { user: { id: opts.authUser.id } }, error: null };
      },
    },
    from() {
      return this;
    },
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async single() {
      if (opts.selectError) return { data: null, error: new Error("not found") };
      return { data: opts.profileRow, error: null };
    },
  };
  return supabase as any;
}

describe("profile.service", () => {
  it("throws UnauthorizedError when not authenticated", async () => {
    const supabase = createMockSupabase({ authUser: null });
    await expect(getCurrentProfile(supabase)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("maps missing profile to NotFoundError", async () => {
    const supabase = createMockSupabase({ authUser: { id: "u" }, profileRow: null, selectError: true });
    await expect(getCurrentProfile(supabase)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns ProfileDTO for existing profile", async () => {
    const row = { user_id: "u", is_admin: false, created_at: new Date().toISOString() };
    const supabase = createMockSupabase({ authUser: { id: "u" }, profileRow: row });
    const result = await getCurrentProfile(supabase);
    expect(result).toEqual(row);
  });
});


