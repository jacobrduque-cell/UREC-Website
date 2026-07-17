"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/announcements", label: "Announcements" },
  { href: "/assignments", label: "Assignments" },
  { href: "/grades", label: "Grades" },
  { href: "/modules", label: "Modules" },
  { href: "/files", label: "Files" },
  { href: "/calendar", label: "Calendar" },
  { href: "/directory", label: "People" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-6">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-ui transition-colors ${
              active
                ? "bg-navy text-white"
                : "text-text hover:bg-hair"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
