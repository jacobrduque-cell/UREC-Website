import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createWikiPage } from "../actions";
import { WikiPageForm } from "../wiki-page-form";

export default async function NewWikiPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/pages");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        New Page
      </h1>

      <WikiPageForm
        action={createWikiPage}
        submitLabel="Create Page"
        cancelHref="/pages"
        bodyPlaceholder={"## Heading\n\nBody text, **bold**, *italic*, [links](https://example.com), lists, etc."}
        publishLabel={
          <>
            Publish immediately (otherwise saved as a draft, visible to exec
            only)
          </>
        }
      />
    </div>
  );
}
