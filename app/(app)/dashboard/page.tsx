import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";

const LINKS = [
  {
    href: "/deal-library.html",
    title: "Deal Library",
    description: "Interactive case studies on landmark CRE deals.",
    external: true,
  },
  {
    href: "/announcements",
    title: "Announcements",
    description: "What exec has posted for the club.",
  },
  {
    href: "/assignments",
    title: "Assignments",
    description: "HW, case studies, and grading.",
  },
  {
    href: "/modules",
    title: "Modules",
    description: "Course content and reading pages.",
  },
  {
    href: "/calendar",
    title: "Calendar",
    description: "Meetings, deadlines, and events.",
  },
  {
    href: "/directory",
    title: "People",
    description: "Everyone enrolled in the program.",
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
        },
      ]
    : LINKS;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">
        Welcome, {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        {course?.name ?? "UREC Analyst Program"} &mdash; here&rsquo;s
        everything the platform holds today.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className="rounded-lg border border-hair bg-white p-5 transition-colors hover:border-blue"
          >
            <p className="font-display text-lg text-navy">{link.title}</p>
            <p className="mt-1 text-sm text-muted">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
