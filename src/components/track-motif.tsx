/**
 * Decorative rollercoaster track: a rail over dashed "ties". Pure SVG, takes
 * the current text colour, so it works on the hero gradient and on cards in
 * both themes. Always aria-hidden.
 */
export function TrackMotif({ className }: { className?: string }) {
  const d = "M0 70 C 30 70, 40 12, 70 12 S 110 78, 140 60 S 180 8, 220 30";
  return (
    <svg viewBox="0 0 220 90" aria-hidden="true" className={className} fill="none" stroke="currentColor">
      <path d={d} strokeWidth="9" strokeDasharray="2 7" opacity="0.55" />
      <path d={d} strokeWidth="2" />
    </svg>
  );
}
