export default function UsitePage() {
  const label = "site";
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
      <div className="mt-8 rounded-lg border border-[#E7E5E4] p-12 text-center">
        <p className="font-display text-xl font-medium">Coming soon.</p>
        <p className="mt-2 text-sm text-[#737373]">This section is under construction.</p>
      </div>
    </div>
  );
}
