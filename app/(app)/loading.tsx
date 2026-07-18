// Shown while an app route's server component streams. A calm skeleton
// beats a blank screen on slower Supabase round-trips.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse px-8 py-12" aria-hidden>
      <div className="h-7 w-56 rounded bg-hair" />
      <div className="mt-3 h-4 w-40 rounded bg-hair/70" />
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-md border border-hair bg-white">
            <div className="flex h-full items-center gap-3 px-4">
              <div className="h-8 w-8 rounded-full bg-hair" />
              <div className="flex-1">
                <div className="h-3.5 w-1/3 rounded bg-hair" />
                <div className="mt-2 h-3 w-1/4 rounded bg-hair/70" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
