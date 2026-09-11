import { describe, expect, it } from "vitest";
import { tierFor } from "./tiers";

describe("tierFor", () => {
  it("has no tier with zero credits and points at Rookie", () => {
    const t = tierFor(0);
    expect(t.current).toBeNull();
    expect(t.next?.name).toBe("Rookie");
    expect(t.progress).toBe(0);
    expect(t.remaining).toBe(1);
  });

  it("reaches a tier exactly at its floor", () => {
    expect(tierFor(1).current?.name).toBe("Rookie");
    expect(tierFor(10).current?.name).toBe("Coaster Hunter");
    expect(tierFor(10).next?.name).toBe("Track Legend");
  });

  it("measures progress between the current and next floors", () => {
    const t = tierFor(10); // Coaster Hunter (10) → Track Legend (25)
    expect(t.progress).toBe(0);
    expect(t.remaining).toBe(15);
    expect(tierFor(17.5).progress).toBeCloseTo(0.5);
  });

  it("caps at the top tier", () => {
    const t = tierFor(80);
    expect(t.current?.name).toBe("Century Club");
    expect(t.next).toBeNull();
    expect(t.progress).toBe(1);
    expect(t.remaining).toBe(0);
  });
});
