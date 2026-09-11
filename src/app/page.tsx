import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tierFor } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/tier-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Never cached: opting out must remove a user immediately (FR7).
export const dynamic = "force-dynamic";

type LeaderboardRow = {
  rank: number;
  display_name: string;
  credits: number;
  rides: number;
};

function Medal({ rank }: { rank: number }) {
  const look =
    rank === 1
      ? "bg-amber-400 text-stone-900"
      : rank === 2
        ? "bg-slate-300 text-stone-900"
        : rank === 3
          ? "bg-amber-700 text-white"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-grid size-7 place-items-center rounded-full text-xs font-bold tabular-nums", look)}>
      {rank}
    </span>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  // The only data a visitor can read: an aggregate exposed by a SQL function.
  const { data, error } = await supabase.rpc("get_leaderboard");
  const rows = (data ?? []) as LeaderboardRow[];
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl">Leaderboard</h1>
        <p className="max-w-2xl text-muted-foreground">
          A credit is a unique rollercoaster you have ridden at least once. Only enthusiasts who
          opted in appear here, and only their display name and credit count are shown.
        </p>
        {!user && (
          <div className="flex flex-wrap gap-2">
            <Link href="/signup" className={cn(buttonVariants(), "btn-glow")}>
              Start counting
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        )}
      </section>

      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Top credit counts</CardTitle>
          <CardDescription>
            Ranked by credits, then total rides. Want to be here? Turn it on in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">The leaderboard could not be loaded right now.</p>
          ) : rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nobody has opted in yet</EmptyTitle>
                <EmptyDescription>
                  Be the first: sign up, log a few rides and enable the leaderboard in Settings.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Enthusiast</TableHead>
                  <TableHead className="hidden md:table-cell">Tier</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Rides</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => {
                  const tier = tierFor(row.credits).current;
                  return (
                    <TableRow key={`${row.rank}-${row.display_name}-${i}`}>
                      <TableCell>
                        <Medal rank={row.rank} />
                      </TableCell>
                      <TableCell className="max-w-56 truncate font-medium">{row.display_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tier ? <TierBadge name={tier.name} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-heading text-lg tabular-nums">{row.credits}</TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                        {row.rides}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
