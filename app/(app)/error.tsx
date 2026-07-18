"use client";

// Route-segment error boundary for the app. Server-component throws (a
// failed Supabase call, a bad query) land here instead of a white screen,
// with a way to retry — and now with the error detail surfaced so a
// problem can actually be diagnosed instead of just "something went wrong".
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-start px-8 py-16">
      <h1 className="font-display text-xl font-bold text-navy-deep">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted">
        That page hit an error. It&rsquo;s usually temporary — try again, or
        head back to your dashboard.
      </p>

      {(error?.message || error?.digest) && (
        <pre className="mt-4 w-full overflow-x-auto rounded-md border border-hair bg-paper-warm px-3 py-2 text-xs text-neg">
          {error.message || "Server error"}
          {error.digest ? `\n(ref: ${error.digest})` : ""}
        </pre>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-hair px-5 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
