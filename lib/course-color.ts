// Deterministic bCourses-style header color for a course, keyed off its
// id so a given course always gets the same color across the dashboard,
// the admin list, and the color "film" laid over its cover image.
export const CARD_COLORS = [
  "#1B3D7B",
  "#2B7ABC",
  "#0E6E52",
  "#8A2E63",
  "#B4531A",
  "#334451",
  "#5B3A8A",
];

export function courseColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}
