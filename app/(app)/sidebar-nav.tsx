"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Real bCourses course nav is plain text links (no icons — icons live
// only on the far-left global rail), blue, with the active item bold
// black and marked by a left border bar. Order mirrors bCourses:
// Home, Announcements, Syllabus, Modules, Assignments, Discussions,
// Quizzes, People, Grades, Files, Calendar.
const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/announcements", label: "Announcements" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/modules", label: "Modules" },
  { href: "/assignments", label: "Assignments" },
  { href: "/discussions", label: "Discussions" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/glossary", label: "Glossary" },
  { href: "/directory", label: "People" },
  { href: "/grades", label: "Grades" },
  { href: "/files", label: "Files" },
  { href: "/calendar", label: "Calendar" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col py-3">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`border-l-4 py-2.5 pl-4 pr-3 text-sm transition-colors ${
              active
                ? "border-l-navy-deep font-bold text-navy-deep"
                : "border-l-transparent font-normal text-sky hover:bg-[#eef7ff]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
