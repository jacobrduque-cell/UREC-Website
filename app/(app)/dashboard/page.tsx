import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone, ClipboardList, MessagesSquare, Folder, BookMarked } from "lucide-react";

type CourseCard = {
  id: string;
  name: string;
  code: string | null;
  term: { name: string } | null;
};
type DueRow = { id: string; title: string; due_at: string; points_possible: number; submissions: { id: string }[] };
type EventRow = { id: string; title: string; starts_at: string };
type FeedbackRow = { points_earned: number; graded_at: string; submission: { assignment: { title: string; points_possible: number } | null } | null };

// Deterministic bCourses-style card header color from the course id.
const CARD_COLORS = ["#1B3D7B", "#2B7ABC", "#0E6E52", "#8A2E63", "#B4531A", "#334451", "#5B3A8A"];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const nowIso = new Date().toISOString();

  // RLS scopes `courses` to what this person can see (published +
  // enrolled, or everything for exec), so no extra filtering needed.
  const [{ data: coursesData }, { data: dueData }, { data: eventData }, { data: feedbackData }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, code, term:terms(name, starts_on)")
        .order("created_at", { ascending: false }),
      supabase
        .from("assignments")
        .select("id, title, due_at, points_possible, submissions(id)")
        .eq("published", true)
        .gte("due_at", nowIso)
        .eq("submissions.user_id", user.id)
        .order("due_at", { ascending: true })
        .limit(5),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("grades")
        .select("points_earned, graded_at, submission:submissions!inner(user_id, assignment:assignments(title, points_possible))")
        .eq("submission.user_id", user.id)
        .order("graded_at", { ascending: false })
        .limit(5),
    ]);

  const courses = (coursesData ?? []) as unknown as CourseCard[];
  const toDo = ((dueData ?? []) as unknown as DueRow[]).filter((a) => a.submissions.length === 0);
  const upcoming = (eventData ?? []) as unknown as EventRow[];
  const feedback = (feedbackData ?? []) as unknown as FeedbackRow[];

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <h1 className="font-ui text-xl font-bold text-navy-deep">
        Welcome, {profile?.full_name ?? user.email}
      </h1>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <h2 className="text-sm font-bold text-navy-deep">Courses</h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border border-hair bg-white shadow-sm">
                <Link href={`/enter/${c.id}?to=/home`} aria-label={c.name}>
                  <div className="h-28" style={{ backgroundColor: colorFor(c.id) }} />
                </Link>
                <div className="p-4">
                  <Link href={`/enter/${c.id}?to=/home`} className="font-ui text-sm font-bold text-sky hover:underline">
                    {c.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {c.code ? `${c.code} · ` : ""}{c.term?.name ?? ""}
                  </p>
                  <div className="mt-3 flex items-center gap-4 border-t border-hair pt-3 text-muted">
                    <Link href={`/enter/${c.id}?to=/home`} title="Announcements" className="hover:text-sky"><Megaphone className="h-4 w-4" strokeWidth={1.75} /></Link>
                    <Link href={`/enter/${c.id}?to=/assignments`} title="Assignments" className="hover:text-sky"><ClipboardList className="h-4 w-4" strokeWidth={1.75} /></Link>
                    <Link href={`/enter/${c.id}?to=/discussions`} title="Discussions" className="hover:text-sky"><MessagesSquare className="h-4 w-4" strokeWidth={1.75} /></Link>
                    <Link href={`/enter/${c.id}?to=/files`} title="Files" className="hover:text-sky"><Folder className="h-4 w-4" strokeWidth={1.75} /></Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Deal Library is a separate product, not a course — a
                distinct card so it stays discoverable from the home. */}
            <Link
              href="/deal-library.html"
              target="_blank"
              rel="noopener noreferrer"
              className="overflow-hidden rounded-lg border border-hair bg-white shadow-sm transition-colors hover:border-blue"
            >
              <div className="flex h-28 items-center justify-center bg-navy-deep">
                <BookMarked className="h-8 w-8 text-white/90" strokeWidth={1.5} />
              </div>
              <div className="p-4">
                <p className="font-ui text-sm font-bold text-sky">Deal Library</p>
                <p className="mt-0.5 text-xs text-muted">Interactive CRE case studies</p>
              </div>
            </Link>

            {courses.length === 0 && (
              <p className="text-sm text-muted">No courses yet.</p>
            )}
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
                      {new Date(a.due_at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric" })}
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
                      {new Date(e.starts_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
