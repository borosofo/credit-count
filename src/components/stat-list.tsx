import type { CreditBucket } from "@/lib/stats";

/** Compact horizontal-bar list for "credits by X". Server-safe, no client JS. */
export function StatList({ buckets, max = 6 }: { buckets: CreditBucket[]; max?: number }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">No credits yet.</p>;
  }
  const top = buckets.slice(0, max);
  const rest = buckets.slice(max);
  const biggest = top[0]?.credits ?? 1;

  return (
    <ul className="flex flex-col gap-2">
      {top.map((b) => (
        <li key={b.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate capitalize">{b.key}</span>
            <span className="shrink-0 font-medium tabular-nums">{b.credits}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(6, Math.round((b.credits / biggest) * 100))}%` }}
            />
          </div>
        </li>
      ))}
      {rest.length > 0 && (
        <li className="text-xs text-muted-foreground">
          +{rest.length} more ({rest.reduce((n, b) => n + b.credits, 0)} credits)
        </li>
      )}
    </ul>
  );
}
