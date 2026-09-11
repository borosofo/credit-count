/**
 * Proves the access rules of docs/TDD.md §4 through the public API, exactly
 * the way a hostile client would call it (AC2, AC4, FR1, FR6–FR9).
 *
 * It uses only the publishable key. Two throwaway enthusiasts are created via
 * the normal sign-up flow (email confirmation must be off, as in v1), one logs
 * a ride, and then the other user and an anonymous client try everything they
 * must not be able to do.
 *
 *   npm run rls-check            # reads .env.local (or the environment)
 *
 * Exit code 1 if any check fails. Throwaway users are left behind (deleting
 * users needs the service-role key, which this project never uses); they are
 * named "RLS check" and never opt in to the leaderboard.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// --- env -------------------------------------------------------------------

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local: rely on the environment */
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Supabase Auth rejects placeholder domains such as example.com, so throwaway
// users are plus-aliases of a real mailbox you control: RLS_CHECK_EMAIL=you@host.
const emailBase = process.env.RLS_CHECK_EMAIL;
if (!url || !key || !emailBase?.includes("@")) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and RLS_CHECK_EMAIL (see .env.example).",
  );
  process.exit(2);
}
const [emailUser, emailHost] = emailBase.split("@");

// --- tiny test harness -------------------------------------------------------

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];

function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function client(): SupabaseClient {
  return createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signUpThrowaway(label: string) {
  const supabase = client();
  const email = `${emailUser}+rls-${Date.now()}-${label}@${emailHost}`;
  const password = `Rls-check-${Math.random().toString(36).slice(2)}-A1!`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: `RLS check ${label}` } },
  });
  if (error || !data.session) {
    throw new Error(`Could not sign up throwaway user ${label}: ${error?.message ?? "no session (is email confirmation off?)"}`);
  }
  return { supabase, id: data.user!.id, email };
}

const isDenied = (error: { code?: string } | null) => error?.code === "42501";

// --- scenario ----------------------------------------------------------------

async function main() {
  console.log(`Target: ${url}\n`);

  const a = await signUpThrowaway("a");
  const b = await signUpThrowaway("b");
  const anon = client();

  // A coaster to log against (any signed-in user can read the catalogue).
  const { data: coasters, error: coastersError } = await a.supabase
    .from("coasters")
    .select("id, name")
    .order("name")
    .limit(2);
  check("enthusiast can read the catalogue", !coastersError && (coasters?.length ?? 0) > 0, coastersError?.message);
  const coasterId = coasters![0].id as string;

  // A logs a ride.
  const { data: rideRows, error: rideError } = await a.supabase
    .from("rides")
    .insert({ user_id: a.id, coaster_id: coasterId, ridden_on: new Date().toISOString().slice(0, 10), note: "rls-check" })
    .select("id");
  check("enthusiast can log their own ride", !rideError && rideRows?.length === 1, rideError?.message);
  const rideId = rideRows![0].id as string;

  // --- FR6 / FR9 / AC2: user B against A's data ------------------------------
  {
    const { data } = await b.supabase.from("rides").select("id");
    check("B cannot read A's rides (select returns nothing)", (data?.length ?? 0) === 0, `${data?.length ?? 0} rows`);

    const { data: byId } = await b.supabase.from("rides").select("id, note").eq("id", rideId);
    check("B cannot read A's ride by id", (byId?.length ?? 0) === 0);

    const { data: upd } = await b.supabase.from("rides").update({ note: "hacked" }).eq("id", rideId).select("id");
    check("B cannot update A's ride (0 rows affected)", (upd?.length ?? 0) === 0);

    const { data: del } = await b.supabase.from("rides").delete().eq("id", rideId).select("id");
    check("B cannot delete A's ride (0 rows affected)", (del?.length ?? 0) === 0);

    const { error } = await b.supabase
      .from("rides")
      .insert({ user_id: a.id, coaster_id: coasterId, ridden_on: "2026-01-01" });
    check("B cannot insert a ride on A's behalf (WITH CHECK)", isDenied(error), error?.code);

    const { data: profiles } = await b.supabase.from("profiles").select("id");
    check("B sees only their own profile", profiles?.length === 1 && profiles[0].id === b.id, `${profiles?.length ?? 0} rows`);

    const { error: roleError } = await b.supabase.from("profiles").update({ role: "admin" }).eq("id", b.id);
    check("B cannot promote themselves to admin (column grant)", isDenied(roleError), roleError?.code);
  }

  // --- FR8 / AC4: enthusiast against the catalogue ----------------------------
  {
    const { error: ins } = await b.supabase
      .from("coasters")
      .insert({ name: "Fake Coaster", park: "Nowhere", country: "Nowhere", manufacturer: "None", type: "steel" });
    check("enthusiast cannot add a coaster", isDenied(ins), ins?.code);

    const { data: upd } = await b.supabase.from("coasters").update({ name: "Renamed" }).eq("id", coasterId).select("id");
    check("enthusiast cannot edit a coaster (0 rows affected)", (upd?.length ?? 0) === 0);

    const { data: del } = await b.supabase.from("coasters").delete().eq("id", coasterId).select("id");
    check("enthusiast cannot delete a coaster (0 rows affected)", (del?.length ?? 0) === 0);

    const { error: merge } = await b.supabase.rpc("merge_coaster", { p_from: coasterId, p_into: coasters![1]?.id ?? coasterId });
    check("enthusiast cannot call merge_coaster", isDenied(merge) || Boolean(merge), merge?.code);
  }

  // --- FR1 / FR7 / AC3: anonymous visitor --------------------------------------
  {
    const { error: rides } = await anon.from("rides").select("id");
    check("visitor cannot read rides", isDenied(rides), rides?.code);

    const { error: coastersAnon } = await anon.from("coasters").select("id");
    check("visitor cannot read the catalogue", isDenied(coastersAnon), coastersAnon?.code);

    const { error: profilesAnon } = await anon.from("profiles").select("id");
    check("visitor cannot read profiles", isDenied(profilesAnon), profilesAnon?.code);

    const { data: board, error: boardError } = await anon.rpc("get_leaderboard");
    const keys = board?.[0] ? Object.keys(board[0]).sort().join(",") : "(empty)";
    check("visitor can read the leaderboard", !boardError, boardError?.message);
    check(
      "leaderboard exposes only rank, display_name, credits, rides, is_you",
      !board?.[0] || keys === "credits,display_name,is_you,rank,rides",
      keys,
    );
    check("visitor is never marked as 'you'", !(board ?? []).some((r: { is_you: boolean }) => r.is_you));
    const namesOnBoard = (board ?? []).map((r: { display_name: string }) => r.display_name);
    check(
      "users who did not opt in are absent from the leaderboard",
      !namesOnBoard.some((n: string) => n.startsWith("RLS check")),
    );
  }

  // --- FR7: opt in, be seen (only as "you" by yourself), opt out, vanish ------
  {
    type Row = { display_name: string; is_you: boolean };
    await a.supabase.from("profiles").update({ show_on_leaderboard: true }).eq("id", a.id);
    const { data: asA } = await a.supabase.rpc("get_leaderboard");
    const mineAsA = (asA ?? []).filter((r: Row) => r.display_name === "RLS check a");
    check("opted-in user appears and is marked as 'you' for themselves", mineAsA.length === 1 && mineAsA[0].is_you === true);
    const { data: asB } = await b.supabase.rpc("get_leaderboard");
    const aSeenByB = (asB ?? []).filter((r: Row) => r.display_name === "RLS check a");
    check("the same row is not 'you' for another user", aSeenByB.length === 1 && aSeenByB[0].is_you === false);
    await a.supabase.from("profiles").update({ show_on_leaderboard: false }).eq("id", a.id);
    const { data: after } = await anon.rpc("get_leaderboard");
    check("opting out removes the user immediately", !(after ?? []).some((r: Row) => r.display_name === "RLS check a"));
  }

  // --- cleanup: A deletes their own ride ---------------------------------------
  const { data: cleaned } = await a.supabase.from("rides").delete().eq("id", rideId).select("id");
  check("enthusiast can delete their own ride", cleaned?.length === 1);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  // exitCode instead of exit(): lets open connections drain (avoids a libuv assertion on Windows).
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
