import { describe, it, expect } from "vitest";
import { getCurrentProfile } from "../src/lib/services/profile.service";
import { UnauthorizedError } from "../src/lib/services/ai.service";

function createMockSupabase(opts: {
  authUser?: { id: string } | null;
  profileRow?: { user_id: string; is_admin: boolean; created_at: string } | null;
  selectError?: boolean;
  insertError?: boolean;
}) {
  let insertCalled = false;
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
    insert() {
      insertCalled = true;
      return this;
    },
    async single() {
      if (opts.selectError && !insertCalled) {
        return { data: null, error: new Error("not found") };
      }
      if (insertCalled) {
        if (opts.insertError) {
          return { data: null, error: new Error("insert failed") };
        }
        return {
          data: {
            user_id: opts.authUser?.id,
            is_admin: false,
            created_at: new Date().toISOString(),
          },
          error: null,
        };
      }
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

  it("automatically creates profile when it doesn't exist", async () => {
    const supabase = createMockSupabase({ authUser: { id: "u" }, profileRow: null, selectError: true });
    const result = await getCurrentProfile(supabase);
    expect(result).toEqual({
      user_id: "u",
      is_admin: false,
      created_at: expect.any(String),
    });
  });

  it("returns existing ProfileDTO when profile exists", async () => {
    const row = { user_id: "u", is_admin: false, created_at: new Date().toISOString() };
    const supabase = createMockSupabase({ authUser: { id: "u" }, profileRow: row });
    const result = await getCurrentProfile(supabase);
    expect(result).toEqual(row);
  });

  it("throws error when profile creation fails", async () => {
    const supabase = createMockSupabase({
      authUser: { id: "u" },
      profileRow: null,
      selectError: true,
      insertError: true,
    });
    await expect(getCurrentProfile(supabase)).rejects.toThrow("Failed to create profile");
  });
});
