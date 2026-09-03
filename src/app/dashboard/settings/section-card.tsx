export function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-[#E7E5E4] bg-white p-6 ${className}`}>
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#737373]">{subtitle}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
