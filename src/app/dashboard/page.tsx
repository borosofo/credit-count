import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth";
import { computeStats, type RideWithCoaster } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { tierFor } from "@/lib/tiers";
import { QuickLog, type CoasterOption } from "./quick-log";
import { CountUp } from "@/components/count-up";
import { StatList } from "@/components/stat-list";
import { TierBadge } from "@/components/tier-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS returns only this user's rides; the filter is belt and braces.
  const [{ data: rideRows }, { data: coasterRows }, profile] = await Promise.all([
    supabase
      .from("rides")
      .select("id, coaster_id, ridden_on, note, coaster:coasters(id, name, park, country, manufacturer, type)")
      .eq("user_id", user.id)
      .order("ridden_on", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<RideWithCoaster[]>(),
    supabase.from("coasters").select("id, name, park, country").order("name").returns<CoasterOption[]>(),
    getProfile(),
  ]);

  const rides = rideRows ?? [];
  const stats = computeStats(rides);
  const tier = tierFor(stats.credits);
  const progressPct = Math.round(tier.progress * 100);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hi {profile?.display_name ?? "there"}</p>
          <h1 className="text-3xl">Your credits</h1>
        </div>
        {profile && (
          <Badge variant={profile.show_on_leaderboard ? "default" : "secondary"}>
            {profile.show_on_leaderboard ? "On the leaderboard" : "Private"}
          </Badge>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="hero-gradient flex flex-col gap-4 rounded-2xl p-6">
          <div className="text-xs font-bold tracking-widest uppercase opacity-90">Credits</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CountUp value={stats.credits} className="font-heading text-7xl leading-none" />
            <TierBadge name={tier.current?.name ?? "No credits yet"} onHero />
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-white/25"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            aria-label={tier.next ? `Progress to ${tier.next.name}` : "Top tier reached"}
          >
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(progressPct, stats.credits > 0 ? 3 : 0)}%` }} />
          </div>
          <p className="text-sm opacity-90">
            {tier.next
              ? `${tier.remaining} more ${tier.remaining === 1 ? "credit" : "credits"} to ${tier.next.name}`
              : "Top tier reached. Century Club."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
          <Card className="card-glow">
            <CardHeader>
              <CardDescription>Rides</CardDescription>
              <CardTitle className="text-4xl">
                <CountUp value={stats.rides} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Every ride, repeats included</CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader>
              <CardDescription>Most ridden</CardDescription>
              <CardTitle className="truncate text-2xl">{stats.mostRidden ? stats.mostRidden.coaster.name : "—"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {stats.mostRidden
                ? `${stats.mostRidden.rides} ${stats.mostRidden.rides === 1 ? "ride" : "rides"} · ${stats.mostRidden.coaster.park}`
                : "Log a ride to find out"}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Log a ride</CardTitle>
          <CardDescription>Search the catalogue, pick the coaster, save. Three steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuickLog coasters={coasterRows ?? []} />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Credits by country</CardTitle>
          </CardHeader>
          <CardContent>
            <StatList buckets={stats.byCountry} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credits by manufacturer</CardTitle>
          </CardHeader>
          <CardContent>
            <StatList buckets={stats.byManufacturer} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Credits by type</CardTitle>
          </CardHeader>
          <CardContent>
            <StatList buckets={stats.byType} />
          </CardContent>
        </Card>
      </section>

      <p className="text-sm text-muted-foreground">
        See and edit every ride in{" "}
        <Link href="/rides" className="font-medium text-foreground underline-offset-4 hover:underline">
          My rides
        </Link>
        .
      </p>
    </div>
  );
}
