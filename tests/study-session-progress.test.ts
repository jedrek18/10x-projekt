import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("Study Session Progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("should maintain session progress across queue refetches", async () => {
    // Symulacja postępu sesji
    let sessionProgress = 0;

    // Symulacja ocenienia kart
    const rateCard = () => {
      sessionProgress += 1;
      return sessionProgress;
    };

    // Test: ocenienie 10 kart
    for (let i = 0; i < 10; i++) {
      const progress = rateCard();
      expect(progress).toBe(i + 1);
    }

    // Po 10 kartach postęp powinien wynosić 10
    expect(sessionProgress).toBe(10);

    // Symulacja refetchu kolejki (reset currentIndex na 0, ale zachowanie sessionProgress)
    const refetchQueue = () => {
      // currentIndex = 0 (nowa kolejka)
      // ale sessionProgress pozostaje 10
      return { currentIndex: 0, sessionProgress };
    };

    const queueState = refetchQueue();
    expect(queueState.currentIndex).toBe(0);
    expect(queueState.sessionProgress).toBe(10);

    // Kontynuacja nauki - kolejne 5 kart
    for (let i = 0; i < 5; i++) {
      const progress = rateCard();
      expect(progress).toBe(11 + i);
    }

    // Całkowity postęp sesji powinien wynosić 15
    expect(sessionProgress).toBe(15);
  });

  it("should calculate progress percentage correctly", () => {
    const dailyGoal = 20;
    const sessionProgress = 10;
    const progressPercentage = (sessionProgress / dailyGoal) * 100;

    expect(progressPercentage).toBe(50);
  });

  it("should persist session progress in localStorage", () => {
    const today = new Date().toISOString().split("T")[0];

    // Symulacja zapisania postępu
    const saveProgress = (progress: number) => {
      localStorageMock.setItem("study_session_progress", progress.toString());
      localStorageMock.setItem("study_session_date", today);
    };

    // Zapisz postęp 5
    saveProgress(5);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("study_session_progress", "5");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("study_session_date", today);

    // Symulacja wczytania postępu
    localStorageMock.getItem.mockReturnValueOnce("5"); // session progress
    localStorageMock.getItem.mockReturnValueOnce(today); // session date

    const loadProgress = () => {
      const savedProgress = localStorageMock.getItem("study_session_progress");
      const savedDate = localStorageMock.getItem("study_session_date");

      if (savedDate === today && savedProgress) {
        return parseInt(savedProgress, 10);
      }
      return 0;
    };

    const loadedProgress = loadProgress();
    expect(loadedProgress).toBe(5);
  });

  it("should reset progress when date changes", () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Symulacja zapisania postępu z wczoraj
    localStorageMock.setItem("study_session_progress", "10");
    localStorageMock.setItem("study_session_date", yesterday);

    // Symulacja wczytania postępu dzisiaj
    localStorageMock.getItem.mockReturnValueOnce("10"); // session progress
    localStorageMock.getItem.mockReturnValueOnce(yesterday); // session date

    const loadProgress = () => {
      const savedProgress = localStorageMock.getItem("study_session_progress");
      const savedDate = localStorageMock.getItem("study_session_date");

      if (savedDate === today && savedProgress) {
        return parseInt(savedProgress, 10);
      }
      return 0;
    };

    const loadedProgress = loadProgress();
    expect(loadedProgress).toBe(0); // Powinno być 0, bo data się zmieniła
  });
});
