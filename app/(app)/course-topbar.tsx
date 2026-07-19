"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { PageCrumb } from "./page-crumb";
import { isCourseRoute } from "./course-routes";
import { QuickCreate } from "./ui/quick-create";

// The course breadcrumb header (hamburger + course name + page crumb).
// Only shown inside a course; the Dashboard/admin pages have no header
// bar, just the blue rail + content.
export function CourseTopBar({
  courseLabel,
  isExec,
}: {
  courseLabel: string;
  isExec: boolean;
}) {
  const pathname = usePathname() ?? "";
  if (!isCourseRoute(pathname)) return null;

  return (
    <header className="flex items-center gap-3 border-b border-hair px-5 py-3.5">
      <label
        htmlFor="nav-toggle"
        className="cursor-pointer rounded p-1 text-muted transition-colors hover:bg-hair hover:text-text"
        aria-label="Toggle course navigation"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </label>
      <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">
        <Link href="/home" className="truncate text-navy-deep hover:underline">
          {courseLabel}
        </Link>
        <PageCrumb />
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <form action="/search" className="hidden sm:block">
          <input
            type="search"
            name="q"
            placeholder="Search course…"
            aria-label="Search course"
            className="w-40 rounded-md border border-hair bg-white px-3 py-1.5 text-xs text-text outline-none transition-[width] focus:w-56 focus:border-blue"
          />
        </form>
        {isExec && <QuickCreate />}
      </div>
    </header>
  );
}
