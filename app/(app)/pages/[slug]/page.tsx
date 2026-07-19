import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { renderMarkdown } from "@/lib/markdown";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteWikiPage, toggleWikiPublished } from "../actions";
import { ConfirmSubmitButton } from "../../ui/form-controls";

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  body_markdown: string;
  published: boolean;
  updated_at: string;
};

export default async function WikiPageDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  if (!course) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("id, title, slug, body_markdown, published, updated_at")
    .eq("course_id", course.id)
    .eq("slug", slug)
    .maybeSingle();

  const page = data as WikiPage | null;
  if (!page) notFound();

  const toggleAction = toggleWikiPublished.bind(null, page.slug, page.published);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            {page.title}
          </h1>
          {!page.published && (
            <span className="mt-2 inline-block rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Draft
            </span>
          )}
        </div>
        {isExec && (
          <div className="flex flex-shrink-0 gap-2">
            <Link
              href={`/pages/${page.slug}/edit`}
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Edit
            </Link>
            <form action={toggleAction}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                {page.published ? "Unpublish" : "Publish"}
              </button>
            </form>
            <form action={deleteWikiPage.bind(null, page.slug)}>
              <ConfirmSubmitButton
                message="Delete this page for good? This can't be undone."
                pendingText="Deleting…"
                className="whitespace-nowrap rounded-md border border-neg/40 px-4 py-2 text-xs font-medium text-neg transition-colors hover:bg-[#fdecea]"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      </div>

      <div
        className="rich-content mt-8 max-w-prose text-sm text-text"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body_markdown) }}
      />
    </div>
  );
}
