import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createAnnouncement } from "../actions";
import { AnnouncementForm } from "../announcement-form";
import { Breadcrumbs } from "../../ui/breadcrumbs";

export default async function NewAnnouncementPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/announcements");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <Breadcrumbs
        items={[
          { label: "Announcements", href: "/announcements" },
          { label: "New" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
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
