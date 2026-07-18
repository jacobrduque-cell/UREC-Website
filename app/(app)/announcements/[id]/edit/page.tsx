import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import { updateAnnouncement } from "../../actions";
import { AnnouncementForm } from "../../announcement-form";

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

      <AnnouncementForm
        action={updateAction}
        mode="edit"
        cancelHref={`/announcements/${id}`}
        defaults={{
          title: a.title,
          body: a.body,
          pinned: a.pinned,
          locked: a.locked,
        }}
      />
    </div>
  );
}
