import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

export default async function LeaderboardPage() {
  const supabase = await createClient();
  // The only data a visitor can read: an aggregate exposed by a SQL function.
  const { data, error } = await supabase.rpc("get_leaderboard");
  const rows = (data ?? []) as LeaderboardRow[];
  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="max-w-2xl text-muted-foreground">
          A credit is a unique rollercoaster you have ridden at least once. Only enthusiasts who
          opted in appear here, and only their display name and credit count are shown.
        </p>
        {!user && (
          <div className="flex flex-wrap gap-2">
            <Link href="/signup" className={buttonVariants()}>
              Start counting
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        )}
      </section>

      <Card>
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
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Enthusiast</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Rides</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={`${row.rank}-${row.display_name}-${i}`}>
                    <TableCell className="font-medium tabular-nums">{row.rank}</TableCell>
                    <TableCell className="max-w-56 truncate">{row.display_name}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{row.credits}</TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {row.rides}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
