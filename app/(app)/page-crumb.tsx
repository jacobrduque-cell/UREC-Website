"use client";

import { usePathname } from "next/navigation";

// Maps the current route to the bCourses-style breadcrumb leaf shown
// after the course name (e.g. "UGBA … › Syllabus").
const LABELS: [string, string][] = [
  ["/announcements", "Announcements"],
  ["/syllabus", "Syllabus"],
  ["/modules", "Modules"],
  ["/pages", "Pages"],
  ["/assignments", "Assignments"],
  ["/discussions", "Discussions"],
  ["/quizzes", "Quizzes"],
  ["/directory", "People"],
  ["/grades", "Grades"],
  ["/files", "Files"],
  ["/calendar", "Calendar"],
  ["/notifications", "Notifications"],
  ["/courses", "Terms & Courses"],
];

export function PageCrumb() {
  const pathname = usePathname() ?? "";
  if (pathname === "/dashboard" || pathname === "/") return null;
  const match = LABELS.find(([href]) => pathname.startsWith(href));
  if (!match) return null;
  return (
    <>
      <span className="text-muted">&rsaquo;</span>
      <span className="text-text">{match[1]}</span>
    </>
  );
}
