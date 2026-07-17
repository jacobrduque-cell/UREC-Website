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
  { href: "/deal-library.html", title: "Deal Library", description: "Interactive case studies on landmark CRE deals.", icon: BookMarked, external: true },
  { href: "/announcements", title: "Announcements", description: "What exec has posted for the club.", icon: Megaphone },
  { href: "/assignments", title: "Assignments", description: "HW, case studies, and grading.", icon: ClipboardList },
  { href: "/modules", title: "Modules", description: "Weekly course content.", icon: BookOpen },
  { href: "/calendar", title: "Calendar", description: "Meetings, deadlines, and events.", icon: CalendarDays },
  { href: "/directory", title: "People", description: "Everyone enrolled in the program.", icon: Users },
];

type DueRow = { id: string; title: string; due_at: string; points_possible: number; submissions: { id: string }[] };
type EventRow = { id: string; title: string; starts_at: string };
type FeedbackRow = { points_earned: number; graded_at: string; submission: { assignment: { title: string; points_possible: number } | null } | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, course, isExec] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
    getIsExec(),
  ]);

  const nowIso = new Date().toISOString();

  // Right-rail data — the bCourses "To Do / Coming Up / Recent Feedback"
  // column. To Do = published assignments due in the future that the
  // viewer hasn't submitted; Coming Up = upcoming calendar events;
  // Recent Feedback = the viewer's most recent grades.
  const [{ data: dueData }, { data: eventData }, { data: feedbackData }] = await Promise.all([
    course
      ? supabase
          .from("assignments")
          .select("id, title, due_at, points_possible, submissions(id)")
          .eq("course_id", course.id)
          .eq("published", true)
          .gte("due_at", nowIso)
          .eq("submissions.user_id", user.id)
          .order("due_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: null }),
    course
      ? supabase
          .from("calendar_events")
          .select("id, title, starts_at")
          .or(`course_id.eq.${course.id},course_id.is.null`)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: null }),
    supabase
      .from("grades")
      .select("points_earned, graded_at, submission:submissions!inner(user_id, assignment:assignments(title, points_possible))")
      .eq("submission.user_id", user.id)
      .order("graded_at", { ascending: false })
      .limit(5),
  ]);

  const toDo = ((dueData ?? []) as unknown as DueRow[]).filter((a) => a.submissions.length === 0);
  const upcoming = (eventData ?? []) as unknown as EventRow[];
  const feedback = (feedbackData ?? []) as unknown as FeedbackRow[];

  const links = isExec
    ? [...LINKS, { href: "/courses", title: "Terms & Courses", description: "Roll over to a new semester, publish courses.", icon: Settings }]
    : LINKS;

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <h1 className="font-ui text-xl font-bold text-navy-deep">
        Welcome, {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-1 text-sm text-muted">{course?.name ?? "UREC Analyst Program"}</p>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <p className="mt-2 font-ui text-sm font-bold text-navy-deep">{link.title}</p>
                    <p className="mt-1 text-xs text-muted">{link.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="w-full flex-shrink-0 lg:w-72">
          <Link
            href="/grades"
            className="block rounded border border-hair bg-white px-4 py-3 text-center text-sm font-medium text-sky transition-colors hover:bg-[#eef7ff]"
          >
            View Grades
          </Link>

          <RailSection title="To Do">
            {toDo.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {toDo.map((a) => (
                  <li key={a.id} className="text-sm">
                    <Link href={`/assignments/${a.id}`} className="font-medium text-sky hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {a.points_possible} pts &middot; Due{" "}
                      {new Date(a.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing to do right now.</p>
            )}
          </RailSection>

          <RailSection title="Coming Up">
            {upcoming.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {upcoming.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium text-text">{e.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(e.starts_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing for the next week</p>
            )}
          </RailSection>

          <RailSection title="Recent Feedback">
            {feedback.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {feedback.map((g, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-text">{g.submission?.assignment?.title ?? "Assignment"}</p>
                    <p className="text-xs text-muted">
                      {g.points_earned}/{g.submission?.assignment?.points_possible ?? "?"} pts
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing for now</p>
            )}
          </RailSection>
        </aside>
      </div>
    </div>
  );
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="border-b border-hair pb-1 text-sm font-bold text-navy-deep">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
