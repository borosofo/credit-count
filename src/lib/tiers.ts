// Credit tiers: the one gamification rule in the app. Derived from the credit
// count on every read, like everything else (TDD §3); nothing is stored.

export type Tier = { name: string; min: number };

export const TIERS: readonly Tier[] = [
  { name: "Rookie", min: 1 },
  { name: "Thrill Seeker", min: 5 },
  { name: "Coaster Hunter", min: 10 },
  { name: "Track Legend", min: 25 },
  { name: "Century Club", min: 50 },
];

export type TierProgress = {
  /** Highest tier reached, or null with zero credits. */
  current: Tier | null;
  /** Next tier to reach, or null at the top. */
  next: Tier | null;
  /** 0..1 progress from the current tier's floor to the next tier's floor. */
  progress: number;
  /** Credits still needed for the next tier (0 at the top). */
  remaining: number;
};

export function tierFor(credits: number): TierProgress {
  const reached = TIERS.filter((t) => credits >= t.min);
  const current = reached[reached.length - 1] ?? null;
  const next = TIERS.find((t) => credits < t.min) ?? null;
  if (!next) return { current, next: null, progress: 1, remaining: 0 };
  const floor = current?.min ?? 0;
  const span = next.min - floor;
  return {
    current,
    next,
    progress: Math.min(1, Math.max(0, (credits - floor) / span)),
    remaining: next.min - credits,
  };
}
