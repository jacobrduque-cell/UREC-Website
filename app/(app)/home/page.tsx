import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { renderMarkdown } from "@/lib/markdown";
import { redirect } from "next/navigation";
import Link from "next/link";

type DueRow = { id: string; title: string; due_at: string; points_possible: number; submissions: { id: string }[] };
type EventRow = { id: string; title: string; starts_at: string };
type FeedbackRow = { points_earned: number; graded_at: string; submission: { assignment: { title: string; points_possible: number } | null } | null };

export default async function CourseHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const nowIso = new Date().toISOString();

  const [{ data: homePage }, { data: dueData }, { data: eventData }, { data: feedbackData }] =
    await Promise.all([
      course
        ? supabase
            .from("wiki_pages")
            .select("body_markdown")
            .eq("course_id", course.id)
            .eq("slug", "home")
            .maybeSingle()
        : Promise.resolve({ data: null }),
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

  const body = homePage?.body_markdown ?? "";
  const toDo = ((dueData ?? []) as unknown as DueRow[]).filter((a) => a.submissions.length === 0);
  const upcoming = (eventData ?? []) as unknown as EventRow[];
  const feedback = (feedbackData ?? []) as unknown as FeedbackRow[];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            {course?.name ?? "UREC Analyst Program"}
          </h1>
          {isExec && (
            <Link
              href="/home/edit"
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Edit
            </Link>
          )}
        </div>

        {body ? (
          <div
            className="rich-content mt-6 max-w-prose text-sm text-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        ) : (
          <p className="mt-6 text-sm text-muted">
            Welcome to {course?.name ?? "the course"}.
            {isExec
              ? " Use Edit to write the course front page — a welcome, what to expect, and where to start."
              : " Your exec team hasn't set up the front page yet."}
          </p>
        )}
      </div>

      <aside className="w-full flex-shrink-0 lg:w-64">
        <Link
          href="/calendar"
          className="block rounded border border-hair bg-white px-4 py-2.5 text-center text-sm font-medium text-sky transition-colors hover:bg-[#eef7ff]"
        >
          View Course Calendar
        </Link>
        <Link
          href="/notifications"
          className="mt-2 block rounded border border-hair bg-white px-4 py-2.5 text-center text-sm font-medium text-sky transition-colors hover:bg-[#eef7ff]"
        >
          View Notifications
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
            <p className="text-sm text-muted">Nothing for now</p>
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
