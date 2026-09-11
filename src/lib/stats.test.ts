import { describe, expect, it } from "vitest";
import { computeStats, type Coaster, type RideWithCoaster } from "./stats";

const fury: Coaster = {
  id: "c1",
  name: "Fury 325",
  park: "Carowinds",
  country: "United States",
  manufacturer: "Bolliger & Mabillard",
  type: "steel",
};
const taron: Coaster = {
  id: "c2",
  name: "Taron",
  park: "Phantasialand",
  country: "Germany",
  manufacturer: "Intamin",
  type: "steel",
};
const wodan: Coaster = {
  id: "c3",
  name: "Wodan Timbur Coaster",
  park: "Europa-Park",
  country: "Germany",
  manufacturer: "Great Coasters International",
  type: "wooden",
};

let seq = 0;
function ride(coaster: Coaster, ridden_on = "2026-09-01"): RideWithCoaster {
  seq += 1;
  return { id: `r${seq}`, coaster_id: coaster.id, ridden_on, note: null, coaster };
}

describe("computeStats", () => {
  it("returns zeros and no most-ridden coaster for a user with no rides", () => {
    const s = computeStats([]);
    expect(s.credits).toBe(0);
    expect(s.rides).toBe(0);
    expect(s.byCountry).toEqual([]);
    expect(s.mostRidden).toBeNull();
  });

  it("counts a credit once per coaster but every ride (SOW definition, AC1)", () => {
    const s = computeStats([ride(fury), ride(fury), ride(fury), ride(taron), ride(wodan)]);
    expect(s.credits).toBe(3);
    expect(s.rides).toBe(5);
  });

  it("buckets credits, not rides, by country, manufacturer and type", () => {
    const s = computeStats([ride(fury), ride(fury), ride(taron), ride(wodan)]);
    expect(s.byCountry).toEqual([
      { key: "Germany", credits: 2 },
      { key: "United States", credits: 1 },
    ]);
    expect(s.byManufacturer).toEqual([
      { key: "Bolliger & Mabillard", credits: 1 },
      { key: "Great Coasters International", credits: 1 },
      { key: "Intamin", credits: 1 },
    ]);
    expect(s.byType).toEqual([
      { key: "steel", credits: 2 },
      { key: "wooden", credits: 1 },
    ]);
  });

  it("picks the most-ridden coaster and breaks ties by name", () => {
    const s = computeStats([ride(taron), ride(taron), ride(fury), ride(fury), ride(wodan)]);
    expect(s.mostRidden).toEqual({ coaster: fury, rides: 2 });
  });

  it("orders buckets by credits desc, then key asc, so the UI is stable", () => {
    const s = computeStats([ride(wodan), ride(taron), ride(fury)]);
    expect(s.byCountry.map((b) => b.key)).toEqual(["Germany", "United States"]);
    expect(s.byType.map((b) => b.key)).toEqual(["steel", "wooden"]);
  });
});
