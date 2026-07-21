// The Attune logo. `LogoMark` is the speech-bubble mark (the exact brand
// artwork, background removed so it sits cleanly on any surface); `Logo` adds
// the rounded "Attune" wordmark, whose color adapts to light/dark.

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mark.png"
      alt="Attune"
      className={className}
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

export function Logo({
  size = 30,
  wordmark = true,
  className = "",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="logo-word" style={{ fontSize: Math.round(size * 0.72) }}>
          Attune
        </span>
      )}
    </span>
  );
}
