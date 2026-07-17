import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { updateWikiPage } from "../../actions";

type WikiPage = {
  title: string;
  body_markdown: string;
  published: boolean;
};

export default async function EditWikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const isExec = await getIsExec();
  if (!isExec) redirect(`/modules/${slug}`);

  const course = await getCurrentCourse();
  if (!course) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("wiki_pages")
    .select("title, body_markdown, published")
    .eq("course_id", course.id)
    .eq("slug", slug)
    .maybeSingle();

  const page = data as WikiPage | null;
  if (!page) notFound();

  const updateAction = updateWikiPage.bind(null, slug);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Edit Page
      </h1>

      <form action={updateAction} className="mt-8 flex flex-col gap-5">
        <div>
          <label
            htmlFor="title"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={page.title}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>

        <div>
          <label
            htmlFor="body_markdown"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Content (Markdown)
          </label>
          <textarea
            id="body_markdown"
            name="body_markdown"
            rows={16}
            defaultValue={page.body_markdown}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            name="published"
            defaultChecked={page.published}
            className="h-4 w-4"
          />
          Published
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Save Changes
          </button>
          <Link
            href={`/modules/${slug}`}
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
