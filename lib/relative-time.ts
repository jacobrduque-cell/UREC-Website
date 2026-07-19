// Friendly, approximate relative-time labels ("in 2 days", "3h ago",
// "yesterday") to sit alongside the absolute dates already shown across
// the app — the small Canvas/Ed/Piazza touch that makes a deadline feel
// present rather than just printed.
//
// Purity note: the repo lints against reading the clock inside a React
// component body. This helper defaults `now` to Date.now() INSIDE the
// function (never at module load), so server components can call
// relativeTime(iso) directly and tests can pin `now`. Buckets are
// deliberately coarse — this is a hint, not a precise duration.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(iso: string | null | undefined, now?: number): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const ref = now ?? Date.now();
  const diff = then - ref; // >0 => future, <0 => past
  const future = diff >= 0;
  const abs = Math.abs(diff);

  // Wrap a magnitude in the right direction: future → "in X", past → "X ago".
  const dir = (label: string) => (future ? `in ${label}` : `${label} ago`);

  if (abs < MIN) return "just now";

  if (abs < HOUR) {
    const m = Math.round(abs / MIN);
    return dir(`${m} min`);
  }

  if (abs < DAY) {
    const h = Math.round(abs / HOUR);
    return dir(`${h}h`);
  }

  if (abs < WEEK) {
    const d = Math.round(abs / DAY);
    if (d === 1) return future ? "tomorrow" : "yesterday";
    return dir(`${d} days`);
  }

  if (abs < 5 * WEEK) {
    const w = Math.round(abs / WEEK);
    return dir(`${w} week${w === 1 ? "" : "s"}`);
  }

  const months = Math.max(1, Math.round(abs / (30 * DAY)));
  return dir(`${months} month${months === 1 ? "" : "s"}`);
}
