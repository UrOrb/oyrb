// The one orchestrated motion moment: a conic-gradient arc rotating once over
// the pipeline summary on dashboard load. Reduced-motion users get a fade
// (handled in globals.css).
export function RadarSweep() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
    >
      <div className="radar-sweep absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
    </div>
  );
}
