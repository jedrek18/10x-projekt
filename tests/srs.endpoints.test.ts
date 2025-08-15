import { describe, it, expect } from "vitest";
import { GET as SrsQueueGET } from "../src/pages/api/srs/queue";
import { POST as SrsPromotePOST } from "../src/pages/api/srs/promote-new";
import { POST as SrsReviewPOST } from "../src/pages/api/srs/review";

type MockUser = { id: string } | null;

function createMockSupabaseUnauth() {
  const auth = {
    async getUser() { return { data: { user: null }, error: new Error("no session") } as any; },
  } as const;
  function from() { throw new Error("should not be called when unauthenticated"); }
  return { auth, from } as any;
}

async function readJson(res: Response): Promise<any> { return await res.json(); }

describe("/api/srs endpoints basic contract", () => {
  it("GET /api/srs/queue returns 401 when unauthenticated", async () => {
    const supabase = createMockSupabaseUnauth();
    const url = new URL("http://localhost/api/srs/queue");
    const res = await SrsQueueGET({ url, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });

  it("POST /api/srs/promote-new returns 401 when unauthenticated", async () => {
    const supabase = createMockSupabaseUnauth();
    const url = new URL("http://localhost/api/srs/promote-new");
    const req = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 1 }) });
    const res = await SrsPromotePOST({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });

  it("POST /api/srs/review returns 401 when unauthenticated", async () => {
    const supabase = createMockSupabaseUnauth();
    const url = new URL("http://localhost/api/srs/review");
    const req = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: "00000000-0000-0000-0000-000000000000", rating: 2 }) });
    const res = await SrsReviewPOST({ request: req, locals: { supabase } } as any);
    expect(res.status).toBe(401);
  });
});


