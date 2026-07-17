import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";
import { assignSection } from "./actions";

type DirectoryRow = {
  id: string;
  email: string;
  full_name: string | null;
  account_roles: { role: { name: string } | null }[];
  enrollments: { id: string; role: { name: string } | null; section: { id: string; name: string } | null }[];
};
type Section = { id: string; name: string };

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
    supabase
      .from("users")
      .select(
        `id, email, full_name,
         account_roles(role:roles(name)),
         enrollments(id, role:roles(name), section:course_sections(id, name))`,
      )
      .order("full_name", { ascending: true, nullsFirst: false }),
    course
      ? supabase.from("course_sections").select("id, name").eq("course_id", course.id).order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const allMembers = (data ?? []) as unknown as DirectoryRow[];
  const sections = (sectionsData ?? []) as unknown as Section[];

  const members = sectionFilter
    ? allMembers.filter((m) =>
        sectionFilter === "none"
          ? !m.enrollments[0]?.section
          : m.enrollments[0]?.section?.id === sectionFilter,
      )
    : allMembers;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">People</h1>
          <p className="mt-2 text-sm text-muted">
            {allMembers.length} member{allMembers.length === 1 ? "" : "s"}
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
          Couldn&rsquo;t load the directory right now.
        </p>
      )}

      <ul className="mt-6 divide-y divide-hair border-t border-hair">
        {members.map((member) => {
          const roleName =
            member.account_roles[0]?.role?.name ??
            member.enrollments[0]?.role?.name ??
            "Member";
          const enrollment = member.enrollments[0];
          const sectionAction = enrollment
            ? assignSection.bind(null, enrollment.id)
            : null;
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {member.full_name ?? member.email}
                </p>
                <p className="truncate text-xs text-muted">{member.email}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {enrollment?.section && (
                  <span className="whitespace-nowrap text-xs text-muted">
                    {enrollment.section.name}
                  </span>
                )}
                <span className="whitespace-nowrap rounded-full border border-hair px-3 py-1 text-xs font-medium tracking-wide text-navy">
                  {roleName}
                </span>
                {isExec && sectionAction && sections.length > 0 && (
                  <form action={sectionAction} className="flex items-center gap-1.5">
                    <select
                      name="section_id"
                      defaultValue={enrollment.section?.id ?? ""}
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
        {members.length === 0 && !error && (
          <li className="py-6 text-sm text-muted">
            No one matches this filter yet.
          </li>
        )}
      </ul>
    </div>
  );
}
