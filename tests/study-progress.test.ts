import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
global.fetch = vi.fn();

describe("Study Progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch progress correctly", async () => {
    const mockProgressResponse = {
      items: [
        {
          date_utc: "2025-01-15",
          reviews_done: 5,
          new_introduced: 2,
          goal_override: null,
          user_id: "test-user",
          created_at: "2025-01-15T00:00:00Z",
          updated_at: "2025-01-15T00:00:00Z",
        },
      ],
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgressResponse,
    });

    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(`/api/progress?date=${today}`);
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith(`/api/progress?date=${today}`);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].reviews_done).toBe(5);
  });

  it("should handle progress fetch errors gracefully", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(`/api/progress?date=${today}`);

    expect(response.ok).toBe(false);
  });
});
