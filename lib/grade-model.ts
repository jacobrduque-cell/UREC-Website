// Grade model — builds the weighted category totals that BOTH the student
// /grades page and the exec /grades/gradebook read from, so the two views
// can never disagree. Categories come from assignment_groups; their
// contents are graded assignments + graded quizzes, plus a special
// "attendance" category computed from attendance_records.
//
// See also lib/grade-weighting.ts (the pure weighted-mean math).

import { overallPercent, type CategoryTotal } from "@/lib/grade-weighting";

// Statuses that earn attendance credit. "excused" counts as present (per
// exec decision); "late" means they showed up, so it counts too. Only
// "absent" earns nothing.
export const ATTENDED_STATUSES = new Set(["present", "late", "excused"]);

export type GroupKind = "standard" | "attendance";

export type GroupMeta = {
  id: string;
  name: string;
  weight: number; // weight_pct, 0-100
  position: number;
  kind: GroupKind;
};

// One graded item's contribution for ONE student (an assignment or a quiz).
export type ItemScore = {
  groupId: string | null; // assignment_group_id; null → ungrouped
  earned: number | null; // null when not graded yet
  possible: number;
};

// A student's attendance tally for the course: sessions they got credit
// for over sessions they were recorded at. held === 0 → not counted.
export type AttendanceScore = { attended: number; held: number };

export type CategoryLine = {
  id: string;
  name: string;
  weight: number;
  position: number;
  kind: GroupKind;
  earned: number;
  possible: number;
  hasData: boolean;
};

const UNGROUPED = "__ungrouped__";

// Roll up one student's items + attendance into per-category totals.
export function buildCategories(
  groups: GroupMeta[],
  items: ItemScore[],
  attendance?: AttendanceScore,
): CategoryLine[] {
  const lines = new Map<string, CategoryLine>();
  for (const g of groups) {
    lines.set(g.id, {
      id: g.id,
      name: g.name,
      weight: g.weight,
      position: g.position,
      kind: g.kind,
      earned: 0,
      possible: 0,
      hasData: false,
    });
  }

  for (const it of items) {
    if (it.earned == null) continue;
    const key = it.groupId ?? UNGROUPED;
    let line = lines.get(key);
    if (!line) {
      line = {
        id: UNGROUPED,
        name: "Ungrouped",
        weight: 0,
        position: 999,
        kind: "standard",
        earned: 0,
        possible: 0,
        hasData: false,
      };
      lines.set(UNGROUPED, line);
    }
    if (line.kind === "attendance") continue; // attendance is computed, not itemized
    line.earned += it.earned;
    line.possible += it.possible;
    line.hasData = true;
  }

  if (attendance && attendance.held > 0) {
    for (const line of lines.values()) {
      if (line.kind !== "attendance") continue;
      line.earned = attendance.attended;
      line.possible = attendance.held;
      line.hasData = true;
    }
  }

  return [...lines.values()].sort((a, b) => a.position - b.position);
}

// The single overall percentage for a set of category lines.
export function categoriesToTotal(lines: CategoryLine[]): number | null {
  return overallPercent(
    lines.map((c): CategoryTotal => ({ weight: c.weight, earned: c.earned, possible: c.possible })),
  );
}
