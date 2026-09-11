import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Hit once a day by Vercel Cron (vercel.json). Supabase pauses Free projects
 * after 7 days without activity; one cheap query keeps the demo alive.
 * Runs as a visitor: get_leaderboard() is the only thing anon can call.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("get_leaderboard");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
