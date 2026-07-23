// Spaced repetition (SM-2-lite) for flashcards. Pure scheduling: given a
// card's current state and how the member rated their recall, return the
// next state — when the card should resurface. Kept deterministic (now is
// passed in) so it's testable and safe in server actions.

export type SrsGrade = "again" | "good" | "easy";
export type SrsState = { interval_days: number; ease: number; reps: number };

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_STATE: SrsState = { interval_days: 0, ease: 2.5, reps: 0 };

export function schedule(
  prev: SrsState,
  grade: SrsGrade,
  nowMs: number,
): SrsState & { due_at: string } {
  let { interval_days, ease, reps } = prev;

  if (grade === "again") {
    // Missed it — resurface in ~10 minutes and knock the ease down a bit.
    return {
      interval_days: 0,
      ease: Math.max(MIN_EASE, ease - 0.2),
      reps: 0,
      due_at: new Date(nowMs + 10 * 60 * 1000).toISOString(),
    };
  }

  if (grade === "easy") ease += 0.15; // "good" leaves ease unchanged.

  if (reps === 0) interval_days = grade === "easy" ? 3 : 1;
  else if (reps === 1) interval_days = grade === "easy" ? 6 : 3;
  else interval_days = Math.round(interval_days * ease * (grade === "easy" ? 1.3 : 1));

  interval_days = Math.max(1, interval_days);
  reps += 1;

  return {
    interval_days,
    ease,
    reps,
    due_at: new Date(nowMs + interval_days * DAY_MS).toISOString(),
  };
}
