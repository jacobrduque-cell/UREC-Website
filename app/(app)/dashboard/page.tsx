import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookMarked,
  Megaphone,
  ClipboardList,
  BookOpen,
  CalendarDays,
  Users,
  Settings,
} from "lucide-react";

const LINKS = [
  {
    href: "/deal-library.html",
    title: "Deal Library",
    description: "Interactive case studies on landmark CRE deals.",
    icon: BookMarked,
    external: true,
  },
  {
    href: "/announcements",
    title: "Announcements",
    description: "What exec has posted for the club.",
    icon: Megaphone,
  },
  {
    href: "/assignments",
    title: "Assignments",
    description: "HW, case studies, and grading.",
    icon: ClipboardList,
  },
  {
    href: "/modules",
    title: "Modules",
    description: "Course content and reading pages.",
    icon: BookOpen,
  },
  {
    href: "/calendar",
    title: "Calendar",
    description: "Meetings, deadlines, and events.",
    icon: CalendarDays,
  },
  {
    href: "/directory",
    title: "People",
    description: "Everyone enrolled in the program.",
    icon: Users,
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, course, isExec] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
    getIsExec(),
  ]);

  const links = isExec
    ? [
        ...LINKS,
        {
          href: "/courses",
          title: "Terms & Courses",
          description: "Roll over to a new semester, publish courses.",
          icon: Settings,
        },
      ]
    : LINKS;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="font-ui text-xl font-bold text-navy-deep">
        Welcome, {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-1 max-w-prose text-sm text-muted">
        {course?.name ?? "UREC Analyst Program"}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="overflow-hidden rounded border border-hair bg-white transition-colors hover:border-blue"
            >
              <div className="h-1.5 bg-blue" />
              <div className="p-4">
                <Icon className="h-6 w-6 text-blue" strokeWidth={1.5} />
                <p className="mt-2 font-ui text-sm font-bold text-navy-deep">
                  {link.title}
                </p>
                <p className="mt-1 text-xs text-muted">{link.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
