import { FerrisWheelIcon, MedalIcon, TicketIcon } from "lucide-react";
import { TrackMotif } from "@/components/track-motif";

/** Left panel of the sign-in and sign-up pages: the pitch, in three lines. */
export function AuthPanel() {
  return (
    <aside className="card-glow relative flex min-h-44 flex-col justify-end gap-4 overflow-hidden rounded-2xl border bg-linear-to-br from-card to-background p-6 md:min-h-full">
      <TrackMotif className="pointer-events-none absolute -right-8 -bottom-3 h-auto w-72 text-primary opacity-30" />
      <p className="relative font-heading text-2xl uppercase tracking-wide">Every coaster counts.</p>
      <ul className="relative flex flex-col gap-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <TicketIcon className="size-4 shrink-0 text-highlight" aria-hidden="true" />
          Log a ride in three taps
        </li>
        <li className="flex items-center gap-2">
          <MedalIcon className="size-4 shrink-0 text-highlight" aria-hidden="true" />
          Climb the leaderboard, only if you opt in
        </li>
        <li className="flex items-center gap-2">
          <FerrisWheelIcon className="size-4 shrink-0 text-highlight" aria-hidden="true" />
          44 coasters from 12 countries, admin curated
        </li>
      </ul>
    </aside>
  );
}
