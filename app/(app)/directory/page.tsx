import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";
import { assignSection } from "./actions";

type EnrollmentRow = {
  id: string;
  role: { name: string } | null;
  section: { id: string; name: string } | null;
  user: { id: string; email: string; full_name: string | null } | null;
};
type Section = { id: string; name: string };

// People is course-scoped: it shows the roster of the ACTIVE course
// (its enrollments), so each course has its own People list — a member
// of one cohort doesn't appear in another course's roster.
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const [isExec, course, { section: sectionFilter }] = await Promise.all([
    getIsExec(),
    getCurrentCourse(),
    searchParams,
  ]);

  const supabase = await createClient();
  const [{ data, error }, { data: sectionsData }] = await Promise.all([
    course
      ? supabase
          .from("enrollments")
          .select(
            `id, role:roles(name), section:course_sections(id, name),
             user:users(id, email, full_name)`,
          )
          .eq("course_id", course.id)
      : Promise.resolve({ data: [], error: null }),
    course
      ? supabase.from("course_sections").select("id, name").eq("course_id", course.id).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const allRows = ((data ?? []) as unknown as EnrollmentRow[])
    .filter((r) => r.user)
    .sort((a, b) =>
      (a.user!.full_name ?? a.user!.email).localeCompare(b.user!.full_name ?? b.user!.email),
    );
  const sections = (sectionsData ?? []) as unknown as Section[];

  const rows = sectionFilter
    ? allRows.filter((r) =>
        sectionFilter === "none" ? !r.section : r.section?.id === sectionFilter,
      )
    : allRows;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">People</h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"} &middot; {allRows.length}{" "}
            member{allRows.length === 1 ? "" : "s"}
          </p>
        </div>
        {isExec && (
          <div className="flex gap-3">
            <Link
              href="/directory/sections"
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Manage Sections
            </Link>
            <Link
              href="/directory/groups"
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Manage Groups
            </Link>
          </div>
        )}
      </div>

      {sections.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/directory"
            className={`rounded-full border px-3 py-1 text-xs font-medium ${!sectionFilter ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
          >
            All
          </Link>
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/directory?section=${s.id}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${sectionFilter === s.id ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
            >
              {s.name}
            </Link>
          ))}
          <Link
            href="/directory?section=none"
            className={`rounded-full border px-3 py-1 text-xs font-medium ${sectionFilter === "none" ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
          >
            No section
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 text-sm text-neg">
          Couldn&rsquo;t load the roster right now.
        </p>
      )}

      <ul className="mt-6 divide-y divide-hair border-t border-hair">
        {rows.map((r) => {
          const sectionAction = assignSection.bind(null, r.id);
          return (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {r.user!.full_name ?? r.user!.email}
                </p>
                <p className="truncate text-xs text-muted">{r.user!.email}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {r.section && (
                  <span className="whitespace-nowrap text-xs text-muted">{r.section.name}</span>
                )}
                <span className="whitespace-nowrap rounded-full border border-hair px-3 py-1 text-xs font-medium tracking-wide text-navy">
                  {r.role?.name ?? "Member"}
                </span>
                {isExec && sections.length > 0 && (
                  <form action={sectionAction} className="flex items-center gap-1.5">
                    <select
                      name="section_id"
                      defaultValue={r.section?.id ?? ""}
                      className="rounded-md border border-hair bg-white px-2 py-1 text-xs text-text outline-none focus:border-blue"
                    >
                      <option value="">No section</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="whitespace-nowrap rounded-md border border-hair px-2 py-1 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
                    >
                      Save
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {rows.length === 0 && !error && (
          <li className="py-6 text-sm text-muted">No one in this course yet.</li>
        )}
      </ul>
    </div>
  );
}
