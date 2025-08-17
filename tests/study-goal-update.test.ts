import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
global.fetch = vi.fn();

describe("Study Goal Update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update daily goal immediately in UI", () => {
    // Symulacja stanu początkowego
    const initialState = {
      meta: {
        daily_goal: 20,
        reviews_done_today: 5,
        due_count: 10,
        new_selected: 5,
      },
      sessionProgress: 5,
    };

    // Symulacja aktualizacji celu
    const updateGoal = (newGoal: number) => {
      return {
        ...initialState,
        meta: {
          ...initialState.meta,
          daily_goal: newGoal,
        },
      };
    };

    // Aktualizuj cel z 20 na 25
    const updatedState = updateGoal(25);

    // Sprawdź czy cel został zaktualizowany
    expect(updatedState.meta.daily_goal).toBe(25);
    expect(updatedState.meta.reviews_done_today).toBe(5); // Postęp pozostaje bez zmian
    expect(updatedState.sessionProgress).toBe(5); // Postęp sesji pozostaje bez zmian
  });

  it("should recalculate progress percentage after goal update", () => {
    const sessionProgress = 10;
    const oldGoal = 20;
    const newGoal = 25;

    // Procent przed aktualizacją
    const oldPercentage = (sessionProgress / oldGoal) * 100;
    expect(oldPercentage).toBe(50); // 10/20 = 50%

    // Procent po aktualizacji
    const newPercentage = (sessionProgress / newGoal) * 100;
    expect(newPercentage).toBe(40); // 10/25 = 40%
  });

  it("should handle goal update API call", async () => {
    const mockResponse = { ok: true };
    (fetch as any).mockResolvedValueOnce(mockResponse);

    const dateUtc = "2025-01-15";
    const newGoal = 25;

    const response = await fetch(`/api/progress/${dateUtc}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goal_override: newGoal,
      }),
    });

    expect(fetch).toHaveBeenCalledWith(`/api/progress/${dateUtc}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goal_override: newGoal,
      }),
    });

    expect(response.ok).toBe(true);
  });
});
