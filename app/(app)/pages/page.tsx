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

// "Pages" — the wiki-page library. Distinct from Modules (which
// sequence pages/assignments/quizzes into weekly containers); a Page
// is one content document, and a module_item of type 'page' points
// here. The reserved 'syllabus' slug is surfaced on its own /syllabus
// route, so it's filtered out of this list.
export default async function PagesIndex() {
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
        .neq("slug", "syllabus")
        .order("title", { ascending: true })
    : { data: null };

  const pages = (data ?? []) as WikiPageRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            Pages
          </h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {isExec && (
          <Link
            href="/pages/new"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            New Page
          </Link>
        )}
      </div>

      {pages.length > 0 ? (
        <ul className="mt-8 divide-y divide-hair border-t border-hair">
          {pages.map((p) => (
            <li key={p.id} className="py-3.5">
              <Link
                href={`/pages/${p.slug}`}
                className="text-sm font-medium text-sky hover:underline"
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
        </ul>
      ) : (
        <div className="mt-8 rounded-md border border-hair bg-white py-16 text-center">
          <div aria-hidden className="text-4xl opacity-70">📄</div>
          <p className="mt-3 text-base font-medium text-text">No pages yet</p>
          <p className="mt-1 text-sm text-muted">
            {isExec
              ? "Write a page to share reference material, guides, or notes."
              : "Nothing here yet — check back soon."}
          </p>
          {isExec && (
            <Link
              href="/pages/new"
              className="mt-5 inline-block rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              New Page
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
