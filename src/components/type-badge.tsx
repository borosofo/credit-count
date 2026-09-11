import type { CoasterType } from "@/lib/stats";
import { cn } from "@/lib/utils";

const styles: Record<CoasterType, string> = {
  steel: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  wooden: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  hybrid: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
};

/** Colour-coded coaster type. One colour per type, same everywhere. */
export function TypeBadge({ type, className }: { type: CoasterType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        styles[type],
        className,
      )}
    >
      {type}
    </span>
  );
}
