import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";
import { assignSection, enrollMembers, removeEnrollment, removePending } from "./actions";
import { ConfirmSubmitButton } from "../ui/form-controls";
import { EnrollForm } from "./enroll-form";
import { SectionAssignForm } from "./section-assign-form";

type EnrollmentRow = {
  id: string;
  role: { name: string } | null;
  section: { id: string; name: string } | null;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    pronouns: string | null;
    major: string | null;
    grad_year: number | null;
    linkedin_url: string | null;
  } | null;
};
type PendingRow = {
  id: string;
  email: string;
  role: { name: string } | null;
  section: { name: string } | null;
};
type Section = { id: string; name: string };
type Role = { id: string; name: string };

// People is course-scoped: it shows the roster of the ACTIVE course
// (its enrollments), so each course has its own People list — a member
// of one cohort doesn't appear in another course's roster.
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; q?: string }>;
}) {
  const [isExec, course, { section: sectionFilter, q: rawQuery }] = await Promise.all([
    getIsExec(),
    getCurrentCourse(),
    searchParams,
  ]);
  const nameQuery = (rawQuery ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const [{ data, error }, { data: sectionsData }, { data: rolesData }, { data: pendingData }] =
    await Promise.all([
      course
        ? supabase
            .from("enrollments")
            .select(
              `id, role:roles(name), section:course_sections(id, name),
             user:users(id, email, full_name, pronouns, major, grad_year, linkedin_url)`,
            )
            .eq("course_id", course.id)
        : Promise.resolve({ data: [], error: null }),
      course
        ? supabase.from("course_sections").select("id, name").eq("course_id", course.id).order("name")
        : Promise.resolve({ data: [] }),
      // Course-scoped roles only (Analyst, Grader) — account roles like
      // VP/Co-President are granted separately, not via enrollment.
      isExec
        ? supabase.from("roles").select("id, name").eq("scope", "course").order("name")
        : Promise.resolve({ data: [] }),
      // Invitations parked for people who haven't signed in yet.
      isExec && course
        ? supabase
            .from("pending_enrollments")
            .select("id, email, role:roles(name), section:course_sections(name)")
            .eq("course_id", course.id)
            .order("email")
        : Promise.resolve({ data: [] }),
    ]);

  const allRows = ((data ?? []) as unknown as EnrollmentRow[])
    .filter((r) => r.user)
    .sort((a, b) =>
      (a.user!.full_name ?? a.user!.email).localeCompare(b.user!.full_name ?? b.user!.email),
    );
  const sections = (sectionsData ?? []) as unknown as Section[];
  const roles = (rolesData ?? []) as unknown as Role[];
  const pending = (pendingData ?? []) as unknown as PendingRow[];

  const sectionRows = sectionFilter
    ? allRows.filter((r) =>
        sectionFilter === "none" ? !r.section : r.section?.id === sectionFilter,
      )
    : allRows;
  const rows = nameQuery
    ? sectionRows.filter((r) => {
        const u = r.user!;
        return (
          (u.full_name ?? "").toLowerCase().includes(nameQuery) ||
          u.email.toLowerCase().includes(nameQuery) ||
          (u.major ?? "").toLowerCase().includes(nameQuery)
        );
      })
    : sectionRows;

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
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/settings/profile"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Edit my profile
          </Link>
          {isExec && (
            <>
              <Link
                href="/directory/progress"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Progress
              </Link>
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
              <Link
                href="/directory/roles"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Manage Roles
              </Link>
            </>
          )}
        </div>
      </div>

      {isExec && course && (
        <details className="mt-6 rounded-lg border border-hair bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-navy-deep">
            + Add people
          </summary>
          <EnrollForm
            action={enrollMembers}
            roles={roles}
            sections={sections}
            defaultRoleId={roles.find((r) => r.name === "Analyst")?.id ?? ""}
          />
        </details>
      )}

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

      <form action="/directory" className="mt-6">
        {sectionFilter && <input type="hidden" name="section" value={sectionFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={rawQuery ?? ""}
          placeholder="Search this roster by name, email, or major…"
          className="w-full rounded-md border border-hair bg-white px-4 py-2 text-sm text-text outline-none focus:border-blue"
        />
      </form>
      {nameQuery && (
        <p className="mt-2 text-xs text-muted">
          {rows.length} match{rows.length === 1 ? "" : "es"} for &ldquo;{rawQuery}&rdquo; ·{" "}
          <Link
            href={sectionFilter ? `/directory?section=${sectionFilter}` : "/directory"}
            className="text-blue hover:underline"
          >
            clear
          </Link>
        </p>
      )}

      <ul className="mt-4 divide-y divide-hair border-t border-hair">
        {rows.map((r) => {
          const sectionAction = assignSection.bind(null, r.id);
          const removeAction = removeEnrollment.bind(null, r.id);
          return (
            <li key={r.id} className="flex items-center justify-between gap-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {r.user!.full_name ?? r.user!.email}
                  {r.user!.pronouns && (
                    <span className="ml-1.5 text-xs font-normal text-muted">({r.user!.pronouns})</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {[
                    r.user!.major,
                    r.user!.grad_year ? `'${String(r.user!.grad_year).slice(2)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || r.user!.email}
                </p>
                {(r.user!.major || r.user!.grad_year) && (
                  <p className="truncate text-xs text-muted">{r.user!.email}</p>
                )}
                {r.user!.linkedin_url && (
                  <a
                    href={r.user!.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue hover:underline"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {r.section && (
                  <span className="whitespace-nowrap text-xs text-muted">{r.section.name}</span>
                )}
                <span className="whitespace-nowrap rounded-full border border-hair px-3 py-1 text-xs font-medium tracking-wide text-navy">
                  {r.role?.name ?? "Member"}
                </span>
                {isExec && sections.length > 0 && (
                  <SectionAssignForm
                    action={sectionAction}
                    sections={sections}
                    currentSectionId={r.section?.id ?? ""}
                  />
                )}
                {isExec && (
                  <form action={removeAction}>
                    <ConfirmSubmitButton
                      message={`Remove ${r.user!.full_name ?? r.user!.email} from this course? This deletes their enrollment.`}
                      className="whitespace-nowrap rounded-md border border-hair px-2 py-1 text-xs font-medium text-neg transition-colors hover:bg-[#fdecea]"
                      title="Remove from course"
                    >
                      Remove
                    </ConfirmSubmitButton>
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

      {isExec && pending.length > 0 && (
        <div className="mt-10">
          <h2 className="border-b border-hair pb-1 text-sm font-bold text-navy-deep">
            Invited &middot; {pending.length}
          </h2>
          <p className="mt-2 text-xs text-muted">
            Enrolled automatically the first time they sign in with Google.
          </p>
          <ul className="mt-3 divide-y divide-hair border-t border-hair">
            {pending.map((p) => {
              const removeAction = removePending.bind(null, p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <p className="truncate text-sm text-text">{p.email}</p>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {p.section?.name && (
                      <span className="whitespace-nowrap text-xs text-muted">{p.section.name}</span>
                    )}
                    <span className="whitespace-nowrap rounded-full border border-hair px-3 py-1 text-xs font-medium tracking-wide text-muted">
                      {p.role?.name ?? "Member"}
                    </span>
                    <form action={removeAction}>
                      <ConfirmSubmitButton
                        message={`Cancel the invite for ${p.email}?`}
                        className="whitespace-nowrap rounded-md border border-hair px-2 py-1 text-xs font-medium text-neg transition-colors hover:bg-[#fdecea]"
                        title="Cancel invite"
                      >
                        Cancel
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
