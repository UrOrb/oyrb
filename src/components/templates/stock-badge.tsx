/**
 * Visible "Stock Image" badge required by Terms §21.2 for any stock photo
 * shown in a portfolio / gallery / before-after / results section. Renders
 * as an absolutely-positioned chip — caller wraps it in a relatively-
 * positioned container.
 *
 * Tone: neutral, small, white-text-on-translucent-black so it reads on any
 * background but doesn't dominate the design. Removing or hiding this with
 * CSS / custom code is a Terms violation.
 */
export function StockBadge({
  position = "top-left",
}: {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const placement = {
    "top-left": "top-1.5 left-1.5",
    "top-right": "top-1.5 right-1.5",
    "bottom-left": "bottom-1.5 left-1.5",
    "bottom-right": "bottom-1.5 right-1.5",
  }[position];

  return (
    <span
      className={`absolute ${placement} z-10 inline-block rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm pointer-events-none`}
      aria-label="This image is a stock photo"
      title="This image is a stock photo, not actual client work."
    >
      Stock photo
    </span>
  );
}
