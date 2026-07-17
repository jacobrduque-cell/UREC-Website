export function PhasePlaceholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">{title}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {title} is scaffolded in the database but doesn&rsquo;t have a UI
        yet &mdash; that lands in {phase}.
      </p>
    </div>
  );
}
