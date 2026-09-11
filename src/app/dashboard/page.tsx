import type { Metadata } from "next";
import Link from "next/link";
import { getProfile, requireUser } from "@/lib/auth";
import { computeStats, type RideWithCoaster } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { QuickLog, type CoasterOption } from "./quick-log";
import { StatList } from "@/components/stat-list";
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
  const firstName = profile?.display_name ?? "there";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hi {firstName}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your credits</h1>
        </div>
        {profile && (
          <Badge variant={profile.show_on_leaderboard ? "default" : "secondary"}>
            {profile.show_on_leaderboard ? "On the leaderboard" : "Private"}
          </Badge>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardDescription>Credits</CardDescription>
            <CardTitle className="text-5xl tabular-nums">{stats.credits}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Unique coasters ridden</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Rides</CardDescription>
            <CardTitle className="text-5xl tabular-nums">{stats.rides}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Every ride, repeats included</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Most ridden</CardDescription>
            <CardTitle className="truncate text-2xl">
              {stats.mostRidden ? stats.mostRidden.coaster.name : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {stats.mostRidden
              ? `${stats.mostRidden.rides} ${stats.mostRidden.rides === 1 ? "ride" : "rides"} · ${stats.mostRidden.coaster.park}`
              : "Log a ride to find out"}
          </CardContent>
        </Card>
      </section>

      <Card>
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
