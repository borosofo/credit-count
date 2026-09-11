/**
 * Creates the demo accounts and their rides for the review, through the public
 * API only (publishable key + normal sign-up). Re-runnable: it signs in when an
 * account already exists, replaces that user's rides and resets the profile.
 *
 * Credentials come from the environment (never committed):
 *   DEMO_ENTHUSIAST_EMAIL / DEMO_ENTHUSIAST_PASSWORD   the "enthusiast" test account
 *   DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD             the "admin" test account
 *   DEMO_EXTRA_EMAIL_BASE / DEMO_EXTRA_PASSWORD        a mailbox for +aliases (extra leaderboard users)
 *
 * The admin role cannot be granted here (by design, TDD §4): run afterwards
 *   update public.profiles set role = 'admin' where id = '<admin user id>';
 *
 *   npm run seed-demo
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* rely on the environment */
  }
}
loadEnvLocal();

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} (see the header of this script)`);
  return v;
};

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const [extraUser, extraHost] = env("DEMO_EXTRA_EMAIL_BASE").split("@");
const extraPassword = env("DEMO_EXTRA_PASSWORD");

type Ride = { coaster: string; on: string; note?: string };
type DemoUser = {
  email: string;
  password: string;
  displayName: string;
  showOnLeaderboard: boolean;
  rides: Ride[];
};

const users: DemoUser[] = [
  {
    email: env("DEMO_ENTHUSIAST_EMAIL"),
    password: env("DEMO_ENTHUSIAST_PASSWORD"),
    displayName: "Sam Rivera",
    showOnLeaderboard: true,
    // 13 rides on 9 coasters: Taron three times, Nemesis Reborn twice (credits ≠ rides).
    rides: [
      { coaster: "Taron", on: "2025-06-14", note: "First ride of the trip. Launch two is unreal." },
      { coaster: "Taron", on: "2025-06-14", note: "Back row, night ride." },
      { coaster: "Black Mamba", on: "2025-06-15" },
      { coaster: "Taron", on: "2025-06-15", note: "Had to do it once more before leaving." },
      { coaster: "Wodan Timbur Coaster", on: "2025-08-02", note: "Rougher than I remembered, still great." },
      { coaster: "Silver Star", on: "2025-08-02" },
      { coaster: "Nemesis Reborn", on: "2026-04-11", note: "Reborn is smoother, same layout magic." },
      { coaster: "Nemesis Reborn", on: "2026-04-11" },
      { coaster: "Hyperia", on: "2026-04-12", note: "That first drop." },
      { coaster: "Fury 325", on: "2026-07-20" },
      { coaster: "Steel Vengeance", on: "2026-07-22", note: "Best coaster I have ridden. Front row." },
      { coaster: "Shambhala", on: "2026-08-30" },
      { coaster: "Helix", on: "2026-09-05", note: "Night ride, second launch in the dark." },
    ],
  },
  {
    email: env("DEMO_ADMIN_EMAIL"),
    password: env("DEMO_ADMIN_PASSWORD"),
    displayName: "Catalogue Admin",
    showOnLeaderboard: false, // admins can ride too, but this one stays private
    rides: [
      { coaster: "Stealth", on: "2026-05-03" },
      { coaster: "Icon", on: "2026-06-21", note: "Blackpool weekend." },
      { coaster: "The Big One", on: "2026-06-21" },
    ],
  },
  {
    email: `${extraUser}+demo-maya@${extraHost}`,
    password: extraPassword,
    displayName: "Maya Okafor",
    showOnLeaderboard: true,
    rides: [
      "Fury 325", "Millennium Force", "Steel Vengeance", "Maverick", "Magnum XL-200", "Top Thrill 2",
      "Iron Gwazi", "VelociCoaster", "El Toro", "The Voyage", "Phoenix", "Twisted Colossus",
      "Leviathan", "Medusa Steel Coaster", "Untamed",
    ].map((coaster, i) => ({ coaster, on: `2026-0${1 + (i % 8)}-${String(3 + i).padStart(2, "0")}` })),
  },
  {
    email: `${extraUser}+demo-lukas@${extraHost}`,
    password: extraPassword,
    displayName: "Lukas Brandt",
    showOnLeaderboard: true,
    rides: [
      { coaster: "Expedition GeForce", on: "2026-05-10" },
      { coaster: "Expedition GeForce", on: "2026-05-10" },
      { coaster: "Expedition GeForce", on: "2026-05-11" },
      { coaster: "Colossos - Kampf der Giganten", on: "2026-05-24" },
      { coaster: "Voltron Nevera", on: "2026-06-07" },
      { coaster: "Silver Star", on: "2026-06-07" },
      { coaster: "Kondaa", on: "2026-07-19" },
      { coaster: "Toutatis", on: "2026-07-20" },
      { coaster: "Hyperion", on: "2026-08-15" },
    ],
  },
  {
    email: `${extraUser}+demo-sofia@${extraHost}`,
    password: extraPassword,
    displayName: "Sofía Restrepo",
    showOnLeaderboard: true,
    rides: [
      { coaster: "Medusa Steel Coaster", on: "2026-03-08", note: "¡Qué máquina!" },
      { coaster: "Shambhala", on: "2026-08-01" },
      { coaster: "Dragon Khan", on: "2026-08-01" },
    ],
  },
  {
    email: `${extraUser}+demo-private@${extraHost}`,
    password: extraPassword,
    displayName: "Private Pete",
    showOnLeaderboard: false, // proves opted-out users never show up
    rides: [
      { coaster: "Zadra", on: "2026-08-16" },
      { coaster: "Hyperion", on: "2026-08-16" },
    ],
  },
];

async function signInOrUp(u: DemoUser): Promise<{ supabase: SupabaseClient; id: string; created: boolean }> {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await supabase.auth.signInWithPassword({ email: u.email, password: u.password });
  if (signIn.data.session) return { supabase, id: signIn.data.user!.id, created: false };

  const signUp = await supabase.auth.signUp({
    email: u.email,
    password: u.password,
    options: { data: { display_name: u.displayName } },
  });
  if (signUp.error || !signUp.data.session) {
    throw new Error(
      `${u.email}: ${signUp.error?.message ?? "no session"} (wrong password for an existing account, or email confirmation is on?)`,
    );
  }
  return { supabase, id: signUp.data.user!.id, created: true };
}

async function main() {
  console.log(`Target: ${url}\n`);
  for (const u of users) {
    const { supabase, id, created } = await signInOrUp(u);

    const { data: coasters, error: cErr } = await supabase.from("coasters").select("id, name");
    if (cErr) throw cErr;
    const byName = new Map((coasters ?? []).map((c) => [c.name as string, c.id as string]));
    const missing = u.rides.map((r) => r.coaster).filter((n) => !byName.has(n));
    if (missing.length) throw new Error(`Unknown coasters: ${[...new Set(missing)].join(", ")}`);

    // Idempotent: replace this user's rides (RLS scopes the delete to their own rows).
    const del = await supabase.from("rides").delete().eq("user_id", id);
    if (del.error) throw del.error;
    const ins = await supabase.from("rides").insert(
      u.rides.map((r) => ({ user_id: id, coaster_id: byName.get(r.coaster)!, ridden_on: r.on, note: r.note ?? null })),
    );
    if (ins.error) throw ins.error;

    const prof = await supabase
      .from("profiles")
      .update({ display_name: u.displayName, show_on_leaderboard: u.showOnLeaderboard })
      .eq("id", id);
    if (prof.error) throw prof.error;

    const credits = new Set(u.rides.map((r) => r.coaster)).size;
    console.log(
      `${created ? "created" : "updated"}  ${u.displayName.padEnd(16)} ${u.email.padEnd(40)} rides=${u.rides.length} credits=${credits} leaderboard=${u.showOnLeaderboard}  id=${id}`,
    );
  }
  console.log("\nDone. Grant the admin role with SQL (see script header).");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
