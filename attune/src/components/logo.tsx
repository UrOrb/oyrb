import { attuneMarkSvg } from "@/lib/logo-svg";

// The Attune logo. `LogoMark` is just the speech-bubble icon; `Logo` adds the
// rounded "Attune" wordmark (Quicksand, theme-adaptive color).

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: attuneMarkSvg({ size }) }}
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
        <span className="logo-word" style={{ fontSize: Math.round(size * 0.74) }}>
          Attune
        </span>
      )}
    </span>
  );
}
