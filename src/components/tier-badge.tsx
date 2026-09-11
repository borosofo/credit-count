import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tier pill. `onHero` variant sits on the gradient hero; default sits on cards. */
export function TierBadge({ name, onHero, className }: { name: string; onHero?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        onHero ? "bg-black/35 text-amber-200" : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <TrophyIcon className="size-3.5" aria-hidden="true" />
      {name}
    </span>
  );
}
