import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createTermAndCourse, setCurrentTerm, toggleCoursePublished } from "./actions";

type CourseRow = { id: string; name: string; code: string | null; published: boolean };
type TermRow = { id: string; name: string; starts_on: string; ends_on: string; is_current: boolean; courses: CourseRow[] };

export default async function CoursesPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("terms")
    .select("id, name, starts_on, ends_on, is_current, courses(id, name, code, published)")
    .order("starts_on", { ascending: false });

  const terms = (data ?? []) as unknown as TermRow[];

  // Flat list of existing courses to offer as a clone source.
  const existingCourses = terms.flatMap((t) =>
    t.courses.map((c) => ({ id: c.id, label: `${c.name}${c.code ? ` (${c.code})` : ""} — ${t.name}` })),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Terms &amp; Courses
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        This is the succession-proofing piece: rolling over to a new
        semester no longer requires hand-writing SQL in Supabase &mdash;
        any exec can do it from here.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {terms.map((t) => (
          <li key={t.id} className="rounded-md border border-hair bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text">
                  {t.name}
                  {t.is_current && (
                    <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                      Current
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t.starts_on} &ndash; {t.ends_on}
                </p>
              </div>
              {!t.is_current && (
                <form action={setCurrentTerm.bind(null, t.id)}>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded-md border border-hair px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
                  >
                    Make Current
                  </button>
                </form>
              )}
            </div>

            <ul className="mt-3 flex flex-col gap-2 border-t border-hair pt-3">
              {t.courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text">
                    {c.name}
                    {c.code && <span className="ml-1.5 text-xs text-muted">({c.code})</span>}
                  </span>
                  <form action={toggleCoursePublished.bind(null, c.id, c.published)}>
                    <button
                      type="submit"
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        c.published
                          ? "border-pos text-pos hover:bg-pos/10"
                          : "border-hair text-muted hover:bg-hair"
                      }`}
                    >
                      {c.published ? "Published" : "Draft — Publish"}
                    </button>
                  </form>
                </li>
              ))}
              {t.courses.length === 0 && (
                <li className="text-xs text-muted">No courses in this term yet.</li>
              )}
            </ul>
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t border-hair pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          New Term + Course
        </h2>
        <form action={createTermAndCourse} className="mt-4 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="term_name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Term Name
              </label>
              <input
                id="term_name"
                name="term_name"
                required
                placeholder="Spring 2027"
                className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="starts_on"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Starts
                </label>
                <input
                  id="starts_on"
                  name="starts_on"
                  type="date"
                  required
                  className="w-full rounded-md border border-hair bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-blue"
                />
              </div>
              <div>
                <label
                  htmlFor="ends_on"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Ends
                </label>
                <input
                  id="ends_on"
                  name="ends_on"
                  type="date"
                  required
                  className="w-full rounded-md border border-hair bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-blue"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="course_name"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Course Name
              </label>
              <input
                id="course_name"
                name="course_name"
                required
                placeholder="UREC Analyst Program"
                className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
            <div>
              <label
                htmlFor="course_code"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Course Code (optional)
              </label>
              <input
                id="course_code"
                name="course_code"
                placeholder="UREC101"
                className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>

          {existingCourses.length > 0 && (
            <div>
              <label
                htmlFor="copy_from"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Copy content from (optional)
              </label>
              <select
                id="copy_from"
                name="copy_from"
                defaultValue=""
                className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
              >
                <option value="">Start empty</option>
                {existingCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                Clones assignments, rubrics, modules, pages, quizzes, and
                calendar events (due dates shifted to the new term). People,
                submissions, and grades are not copied. Everything comes in
                as a draft.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="make_current" className="h-4 w-4" />
            Make this the current term (switches the whole platform over to it)
          </label>

          <button
            type="submit"
            className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Create Term + Course
          </button>
        </form>
      </div>
    </div>
  );
}
