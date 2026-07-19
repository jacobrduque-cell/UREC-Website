import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMyGroupIds, submissionOwnerFilter, getIsExec } from "@/lib/data/queries";
import { relativeTime } from "@/lib/relative-time";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Megaphone, ClipboardList, MessagesSquare, Folder, BookMarked } from "lucide-react";
import { courseColor } from "@/lib/course-color";

type CourseCard = {
  id: string;
  name: string;
  code: string | null;
  cover_image_url: string | null;
  term: { name: string } | null;
};
type DueRow = { id: string; title: string; due_at: string; points_possible: number };
type EventRow = { id: string; title: string; starts_at: string };
type FeedbackRow = { points_earned: number; graded_at: string; submission: { assignment: { title: string; points_possible: number } | null } | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const nowIso = new Date().toISOString();

  // The viewer's group ids across every course, so team submissions
  // (group_id set, user_id NULL) count as "done" and their feedback
  // shows up — a user_id-only filter silently drops all of them.
  const myGroupIds = await getMyGroupIds();
  const ownerFilter = submissionOwnerFilter(user.id, myGroupIds);

  // RLS scopes `courses` to what this person can see (published +
  // enrolled, or everything for exec), so no extra filtering needed.
  const [{ data: coursesData }, { data: dueData }, { data: eventData }, { data: mySubsData }, isExec] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, code, cover_image_url, term:terms(name, starts_on)")
        .order("created_at", { ascending: false }),
      supabase
        .from("assignments")
        .select("id, title, due_at, points_possible")
        .eq("published", true)
        .gte("due_at", nowIso)
        .order("due_at", { ascending: true })
        .limit(15),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(5),
      // Every submission this viewer owns (their own or their group's),
      // used both to clear the To Do list and to pull recent feedback.
      supabase.from("submissions").select("id, assignment_id").or(ownerFilter),
      // Members see a submitted/not-yet hint on This Week; exec don't
      // submit, so we suppress the hint for them.
      getIsExec(),
    ]);

  const courses = (coursesData ?? []) as unknown as CourseCard[];
  const mySubs = (mySubsData ?? []) as { id: string; assignment_id: string }[];
  const submittedAssignmentIds = new Set(mySubs.map((s) => s.assignment_id));
  const toDo = ((dueData ?? []) as unknown as DueRow[])
    .filter((a) => !submittedAssignmentIds.has(a.id))
    .slice(0, 5);
  const upcoming = (eventData ?? []) as unknown as EventRow[];

  // "This Week" = everything due/happening from now through +7 days,
  // Pacific. The window magnitude is timezone-agnostic, so we compare
  // ISO instants directly. We REUSE the already-loaded `dueData` and
  // `eventData` (both ordered soonest-first with an upper time filter
  // applied here) plus `submittedAssignmentIds` — no extra queries.
  const weekEndIso = new Date(
    new Date(nowIso).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  type WeekItem = { kind: "assignment" | "event"; id: string; title: string; when: string; submitted: boolean };
  const thisWeek: WeekItem[] = [
    ...((dueData ?? []) as unknown as DueRow[])
      .filter((a) => a.due_at <= weekEndIso)
      .map((a) => ({
        kind: "assignment" as const,
        id: a.id,
        title: a.title,
        when: a.due_at,
        submitted: submittedAssignmentIds.has(a.id),
      })),
    ...upcoming
      .filter((e) => e.starts_at <= weekEndIso)
      .map((e) => ({ kind: "event" as const, id: e.id, title: e.title, when: e.starts_at, submitted: false })),
  ].sort((x, y) => x.when.localeCompare(y.when));

  // Recent feedback = grades on the viewer's own/group submissions.
  const mySubmissionIds = mySubs.map((s) => s.id);
  let feedback: FeedbackRow[] = [];
  if (mySubmissionIds.length > 0) {
    const { data: feedbackData } = await supabase
      .from("grades")
      .select("points_earned, graded_at, submission:submissions(assignment:assignments(title, points_possible))")
      .in("submission_id", mySubmissionIds)
      .not("graded_at", "is", null)
      .order("graded_at", { ascending: false })
      .limit(5);
    feedback = (feedbackData ?? []) as unknown as FeedbackRow[];
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <h1 className="font-ui text-xl font-bold text-navy-deep">
        Welcome, {profile?.full_name ?? user.email}
      </h1>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <section className="mb-8 rounded-md border border-hair bg-white p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">This Week</h2>
            {thisWeek.length > 0 ? (
              <ul className="mt-3 flex flex-col divide-y divide-hair">
                {thisWeek.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className="flex items-baseline gap-3 py-2 text-sm first:pt-0 last:pb-0"
                  >
                    <span aria-hidden className="flex-shrink-0 leading-none">
                      {item.kind === "assignment" ? "📝" : "📅"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.kind === "assignment" ? `/assignments/${item.id}` : "/calendar"}
                        className="font-medium text-sky hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted">
                        {item.kind === "assignment" ? (
                          <>
                            Due{" "}
                            {new Date(item.when).toLocaleDateString("en-US", {
                              timeZone: "America/Los_Angeles",
                              month: "short",
                              day: "numeric",
                            })}
                          </>
                        ) : (
                          new Date(item.when).toLocaleString("en-US", {
                            timeZone: "America/Los_Angeles",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        )}
                        {item.kind === "assignment" && !isExec && (
                          <span className="text-muted/80">
                            {" "}
                            &middot; {item.submitted ? "✓ Submitted" : "Not yet submitted"}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted/80">{relativeTime(item.when)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Nothing due in the next 7 days &mdash; you&rsquo;re all caught up.
              </p>
            )}
          </section>

          <h2 className="text-sm font-bold text-navy-deep">Courses</h2>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-lg border border-hair bg-white shadow-sm">
                <Link href={`/enter/${c.id}?to=/home`} aria-label={c.name}>
                  <div
                    className="relative h-28 overflow-hidden"
                    style={{ backgroundColor: courseColor(c.id) }}
                  >
                    {c.cover_image_url && (
                      <>
                        <Image
                          src={c.cover_image_url}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          className="object-cover"
                        />
                        {/* the course color as a translucent film over the image */}
                        <span
                          className="absolute inset-0"
                          style={{
                            backgroundColor: courseColor(c.id),
                            opacity: 0.55,
                            mixBlendMode: "multiply",
                          }}
                        />
                      </>
                    )}
                  </div>
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
                      <span className="text-muted/80"> &middot; {relativeTime(a.due_at)}</span>
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
                      <span className="text-muted/80"> &middot; {relativeTime(e.starts_at)}</span>
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
                      {g.graded_at && (
                        <span className="text-muted/80"> &middot; graded {relativeTime(g.graded_at)}</span>
                      )}
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
