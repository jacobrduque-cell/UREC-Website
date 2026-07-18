import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createAnnouncement } from "../actions";
import { AnnouncementForm } from "../announcement-form";

export default async function NewAnnouncementPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/announcements");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Post Announcement
      </h1>

      <AnnouncementForm
        action={createAnnouncement}
        mode="create"
        cancelHref="/announcements"
      />
    </div>
  );
}
