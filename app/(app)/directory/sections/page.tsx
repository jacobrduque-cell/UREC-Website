import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSection } from "../actions";
import { SectionForm } from "./section-form";

type Section = { id: string; name: string; enrollments: { id: string }[] };

export default async function SectionsPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/directory");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("course_sections")
        .select("id, name, enrollments(id)")
        .eq("course_id", course.id)
        .order("name")
    : { data: null };

  const sections = (data ?? []) as unknown as Section[];

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Link href="/directory" className="text-sm text-blue hover:underline">
        &larr; Back to People
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Sections
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Split the roster into cohorts (different meeting times, class
        years, tracks). Assign members to a section from the People page.
      </p>

      <ul className="mt-8 flex flex-col gap-2">
        {sections.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded border border-hair bg-white px-4 py-3"
          >
            <span className="text-sm font-medium text-text">{s.name}</span>
            <span className="text-xs text-muted">
              {s.enrollments.length} member{s.enrollments.length === 1 ? "" : "s"}
            </span>
          </li>
        ))}
        {sections.length === 0 && (
          <li className="text-sm text-muted">No sections yet.</li>
        )}
      </ul>

      <div className="mt-10 border-t border-hair pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          New Section
        </h2>
        <SectionForm action={createSection} />
      </div>
    </div>
  );
}
