import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { updateAnnouncement } from "../../actions";
import { SubmitButton } from "../../../ui/form-controls";

const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const field = "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExec = await getIsExec();
  if (!isExec) redirect("/announcements");

  const supabase = await createClient();
  const { data: a } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, locked")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const updateAction = updateAnnouncement.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">Edit Announcement</h1>

      <form action={updateAction} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="title" className={label}>Title</label>
          <input id="title" name="title" required defaultValue={a.title} className={field} />
        </div>

        <div>
          <label htmlFor="body" className={label}>Message</label>
          <textarea id="body" name="body" required rows={8} defaultValue={a.body} className={field} />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="pinned" defaultChecked={a.pinned} className="h-4 w-4" />
          Pin to the top
        </label>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="locked" defaultChecked={a.locked} className="h-4 w-4" />
          Lock replies (post as announcement-only, no discussion)
        </label>

        <p className="text-xs text-muted">
          Editing doesn&rsquo;t re-notify members — it&rsquo;s a correction, not a new post.
        </p>

        <div className="flex gap-3">
          <SubmitButton
            pendingText="Saving…"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Save Changes
          </SubmitButton>
          <Link
            href={`/announcements/${id}`}
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
