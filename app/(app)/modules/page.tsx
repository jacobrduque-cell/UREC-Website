import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";

type WikiPageRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updated_at: string;
};

export default async function ModulesPage() {
  const [course, isExec] = await Promise.all([
    getCurrentCourse(),
    getIsExec(),
  ]);

  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("wiki_pages")
        .select("id, title, slug, published, updated_at")
        .eq("course_id", course.id)
        .order("title", { ascending: true })
    : { data: null };

  const pages = (data ?? []) as WikiPageRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            Modules
          </h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {isExec && (
          <Link
            href="/modules/new"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            New Page
          </Link>
        )}
      </div>

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {pages.map((p) => (
          <li key={p.id} className="py-3.5">
            <Link
              href={`/modules/${p.slug}`}
              className="text-sm font-medium text-text hover:text-blue"
            >
              {p.title}
            </Link>
            {!p.published && (
              <span className="ml-2 rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Draft
              </span>
            )}
          </li>
        ))}
        {pages.length === 0 && (
          <li className="py-6 text-sm text-muted">
            No pages yet.
            {isExec && " Create the first one with New Page above."}
          </li>
        )}
      </ul>
    </div>
  );
}
