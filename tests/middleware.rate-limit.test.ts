import { describe, it, expect } from "vitest";
import { rateLimitPatchUserSettings } from "../src/lib/rate-limit";

function makeContext(url: string, method: string, ip: string) {
  const headers = new Headers();
  const cookies = new Map<string, string>();
  return {
    request: new Request(url, { method, headers }),
    cookies: {
      get: (name: string) => (cookies.has(name) ? { value: cookies.get(name)! } : undefined),
      set: (name: string, value: string) => {
        cookies.set(name, value);
      },
      delete: (name: string) => {
        cookies.delete(name);
      },
    },
    clientAddress: ip,
    locals: {} as any,
  } as any;
}

describe("rateLimitPatchUserSettings", () => {
  it("limits after N requests per window", () => {
    const ip = "1.2.3.4";
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const res = rateLimitPatchUserSettings(ip, now);
      expect(res.limited).toBe(false);
    }
    const blocked = rateLimitPatchUserSettings(ip, now);
    expect(blocked.limited).toBe(true);
  });
});
