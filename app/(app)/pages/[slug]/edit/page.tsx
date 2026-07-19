import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import { updateWikiPage } from "../../actions";
import { WikiPageForm } from "../../wiki-page-form";
import { Breadcrumbs } from "../../../ui/breadcrumbs";

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
  if (!isExec) redirect(`/pages/${slug}`);

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
      <Breadcrumbs
        items={[
          { label: "Pages", href: "/pages" },
          { label: page.title, href: `/pages/${slug}` },
          { label: "Edit" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Edit Page
      </h1>

      <WikiPageForm
        action={updateAction}
        existing={page}
        submitLabel="Save Changes"
        cancelHref={`/pages/${slug}`}
        publishLabel="Published"
      />
    </div>
  );
}
