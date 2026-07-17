import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createWikiPage } from "../actions";

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

      <form action={createWikiPage} className="mt-8 flex flex-col gap-5">
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
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
            placeholder={"## Heading\n\nBody text, **bold**, *italic*, [links](https://example.com), lists, etc."}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="published" className="h-4 w-4" />
          Publish immediately (otherwise saved as a draft, visible to exec
          only)
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Create Page
          </button>
          <Link
            href="/pages"
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
