"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Megaphone,
  ClipboardList,
  BarChart3,
  BookOpen,
  Folder,
  CalendarDays,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/grades", label: "Grades", icon: BarChart3 },
  { href: "/modules", label: "Modules", icon: BookOpen },
  { href: "/files", label: "Files", icon: Folder },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/directory", label: "People", icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col py-2">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 border-b border-hair px-4 py-3 text-sm font-ui transition-colors ${
              active
                ? "border-l-2 border-l-blue bg-pale text-sky"
                : "border-l-2 border-l-transparent text-muted hover:bg-[#eef7ff] hover:text-sky"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
