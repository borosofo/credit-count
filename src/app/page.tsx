import Link from "next/link";
import { RollerCoasterIcon, TrophyIcon } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tierFor } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { TierBadge } from "@/components/tier-badge";
import { TrackMotif } from "@/components/track-motif";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// Never cached: opting out must remove a user immediately (FR7).
export const dynamic = "force-dynamic";

type LeaderboardRow = {
  rank: number;
  display_name: string;
  credits: number;
  rides: number;
  /** True only on the caller's own row; computed inside the SQL function. */
  is_you: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?").slice(0, 2);
}

const podiumLook = {
  1: { block: "h-22 from-amber-400/70 to-amber-400/10 border-amber-300/60", ring: "ring-4 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,.45)]", label: "1st" },
  2: { block: "h-16 from-slate-300/60 to-slate-300/10 border-slate-300/50", ring: "ring-2 ring-slate-300", label: "2nd" },
  3: { block: "h-12 from-amber-700/70 to-amber-700/10 border-amber-600/60", ring: "ring-2 ring-amber-700", label: "3rd" },
} as const;

function PodiumSpot({ row, place }: { row?: LeaderboardRow; place: 1 | 2 | 3 }) {
  const look = podiumLook[place];
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {row ? (
        <>
          <div
            className={cn(
              "hero-gradient grid place-items-center rounded-full font-heading text-white",
              place === 1 ? "size-16 text-xl" : "size-12 text-base",
              look.ring,
              row.is_you && "outline-2 outline-offset-2 outline-highlight",
            )}
            aria-hidden="true"
          >
            {initials(row.display_name)}
          </div>
          <div className="w-full truncate text-center text-sm font-semibold">
            {row.display_name}
            {row.is_you && <span className="text-muted-foreground"> (you)</span>}
          </div>
          <div className="font-heading text-2xl leading-none tabular-nums">
            {row.credits}
            <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">credits</span>
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">open spot</div>
      )}
      <div
        className={cn(
          "grid w-full place-items-center rounded-t-xl border bg-linear-to-b font-heading text-sm",
          look.block,
        )}
      >
        {look.label}
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  // The only data a visitor can read: an aggregate exposed by a SQL function.
  const { data, error } = await supabase.rpc("get_leaderboard");
  const rows = (data ?? []) as LeaderboardRow[];
  const user = await getSessionUser();
  const [first, second, third, ...rest] = rows;
  const leaderCredits = first?.credits ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="flex items-center gap-3 text-3xl">
          <TrophyIcon className="size-7 text-highlight" aria-hidden="true" />
          Leaderboard
        </h1>
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

      <Card className="card-glow relative overflow-hidden">
        <TrackMotif className="pointer-events-none absolute -top-4 -right-10 h-auto w-72 text-primary opacity-15" />
        <CardHeader className="relative">
          <CardTitle>Top credit counts</CardTitle>
          <CardDescription>
            Ranked by credits, then total rides. Want to be here? Turn it on in Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative flex flex-col gap-6">
          {error ? (
            <p className="text-sm text-destructive">The leaderboard could not be loaded right now.</p>
          ) : rows.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RollerCoasterIcon />
                </EmptyMedia>
                <EmptyTitle>Nobody has opted in yet</EmptyTitle>
                <EmptyDescription>
                  Be the first: sign up, log a few rides and enable the leaderboard in Settings.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="grid grid-cols-3 items-end gap-3 sm:gap-6 sm:px-6">
                <PodiumSpot row={second} place={2} />
                <PodiumSpot row={first} place={1} />
                <PodiumSpot row={third} place={3} />
              </div>

              {rest.length > 0 && (
                <ol className="flex flex-col gap-2" aria-label="Ranks four and below">
                  {rest.map((row, i) => {
                    const tier = tierFor(row.credits).current;
                    const pct = Math.max(4, Math.round((row.credits / leaderCredits) * 100));
                    return (
                      <li
                        key={`${row.rank}-${row.display_name}-${i}`}
                        style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                        className={cn(
                          "grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-xl border bg-card px-3 py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
                          row.is_you && "outline-2 outline-offset-[-2px] outline-highlight",
                        )}
                      >
                        <span className="text-center font-heading text-sm text-muted-foreground tabular-nums">{row.rank}</span>
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">
                              {row.display_name}
                              {row.is_you && <span className="font-normal text-muted-foreground"> (you)</span>}
                            </span>
                            {tier && <TierBadge name={tier.name} className="hidden sm:inline-flex" />}
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <div
                              className="bar-grow h-full rounded-full bg-linear-to-r from-primary to-highlight"
                              style={{ width: `${pct}%`, animationDelay: `${200 + i * 60}ms` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-heading text-lg leading-none tabular-nums">{row.credits}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">{row.rides} rides</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
