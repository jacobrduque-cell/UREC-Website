import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createTermAndCourse, setCurrentTerm, toggleCoursePublished } from "./actions";
import { CourseForm } from "./course-form";

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
        <CourseForm action={createTermAndCourse} existingCourses={existingCourses} />
      </div>
    </div>
  );
}
