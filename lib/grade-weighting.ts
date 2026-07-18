// Grade weighting — one source of truth so the student /grades page and
// the exec /grades/gradebook agree on every student's overall number.
//
// Each assignment_group carries a weight_pct (0-100). A course that sets
// weights gets a weighted average of its graded categories; a course that
// never configured weights falls back to a straight points total so the
// number is still meaningful. Returns a percentage in [0, 100], or null
// when nothing is graded yet.

export type CategoryTotal = {
  weight: number; // assignment_group.weight_pct, 0-100
  earned: number; // sum of points_earned in this category
  possible: number; // sum of points_possible for graded items in this category
};

export function overallPercent(categories: CategoryTotal[]): number | null {
  const graded = categories.filter((c) => c.possible > 0);
  if (graded.length === 0) return null;

  const totalWeight = graded.reduce((s, c) => s + c.weight, 0);
  if (totalWeight > 0) {
    // Weighted mean of each category's percentage. (earned/possible) is a
    // ratio in [0,1]; ×100 makes it a percentage before weighting.
    return (
      graded.reduce((s, c) => s + (c.earned / c.possible) * 100 * c.weight, 0) /
      totalWeight
    );
  }

  // No weights configured anywhere — straight points.
  const earned = graded.reduce((s, c) => s + c.earned, 0);
  const possible = graded.reduce((s, c) => s + c.possible, 0);
  return possible > 0 ? (earned / possible) * 100 : null;
}
