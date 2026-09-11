// Pure statistics over a user's rides. No I/O, no Supabase: the dashboard
// fetches the user's rides (with their coasters embedded) and hands them here.
// Credits and stats are derived on every read, never stored (TDD §3).

export type CoasterType = "steel" | "wooden" | "hybrid";

export type Coaster = {
  id: string;
  name: string;
  park: string;
  country: string;
  manufacturer: string;
  type: CoasterType;
};

export type RideWithCoaster = {
  id: string;
  coaster_id: string;
  ridden_on: string; // ISO date, yyyy-mm-dd
  note: string | null;
  coaster: Coaster;
};

export type CreditBucket = { key: string; credits: number };

export type MostRidden = { coaster: Coaster; rides: number };

export type Stats = {
  /** Unique coasters ridden at least once. The headline number (FR4). */
  credits: number;
  /** Every logged ride, repeats included (FR3). */
  rides: number;
  byCountry: CreditBucket[];
  byManufacturer: CreditBucket[];
  byType: CreditBucket[];
  /** Coaster with the most rides; ties broken by name so the result is stable. */
  mostRidden: MostRidden | null;
};

function bucketCredits(coasters: Coaster[], pick: (c: Coaster) => string): CreditBucket[] {
  const counts = new Map<string, number>();
  for (const c of coasters) {
    const key = pick(c);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, credits]) => ({ key, credits }))
    .sort((a, b) => b.credits - a.credits || a.key.localeCompare(b.key));
}

export function computeStats(rides: RideWithCoaster[]): Stats {
  // One entry per distinct coaster: that is what a credit is.
  const distinct = new Map<string, Coaster>();
  const ridesPerCoaster = new Map<string, number>();
  for (const r of rides) {
    distinct.set(r.coaster_id, r.coaster);
    ridesPerCoaster.set(r.coaster_id, (ridesPerCoaster.get(r.coaster_id) ?? 0) + 1);
  }
  const coasters = [...distinct.values()];

  let mostRidden: MostRidden | null = null;
  for (const [coasterId, count] of ridesPerCoaster) {
    const coaster = distinct.get(coasterId)!;
    if (
      mostRidden === null ||
      count > mostRidden.rides ||
      (count === mostRidden.rides && coaster.name.localeCompare(mostRidden.coaster.name) < 0)
    ) {
      mostRidden = { coaster, rides: count };
    }
  }

  return {
    credits: coasters.length,
    rides: rides.length,
    byCountry: bucketCredits(coasters, (c) => c.country),
    byManufacturer: bucketCredits(coasters, (c) => c.manufacturer),
    byType: bucketCredits(coasters, (c) => c.type),
    mostRidden,
  };
}
