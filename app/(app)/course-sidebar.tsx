"use client";

import { usePathname } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { isCourseRoute } from "./course-routes";

// The white course-nav column. Rendered only when inside a course, so
// the Dashboard and admin pages show just the blue global rail.
export function CourseSidebar({ term }: { term: string }) {
  const pathname = usePathname() ?? "";
  if (!isCourseRoute(pathname)) return null;

  return (
    <aside className="w-56 flex-shrink-0 overflow-hidden border-r border-hair bg-white peer-checked:hidden">
      <p className="px-4 pt-4 text-xs italic text-muted">{term}</p>
      <SidebarNav />
    </aside>
  );
}
