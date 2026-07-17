import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAnnouncement } from "../actions";

export default async function NewAnnouncementPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/announcements");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">
        Post Announcement
      </h1>

      <form action={createAnnouncement} className="mt-8 flex flex-col gap-5">
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
            htmlFor="body"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Message
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={8}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="pinned" className="h-4 w-4" />
          Pin to the top
        </label>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="locked" className="h-4 w-4" />
          Lock replies (post as announcement-only, no discussion)
        </label>

        <div>
          <label
            htmlFor="publish_at"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Publish (leave blank to post immediately)
          </label>
          <input
            id="publish_at"
            name="publish_at"
            type="datetime-local"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
          <p className="mt-1 text-xs text-muted">
            Scheduled for later: hidden from members and no notification
            until then.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
          >
            Post
          </button>
          <Link
            href="/announcements"
            className="rounded-full border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-hair"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
