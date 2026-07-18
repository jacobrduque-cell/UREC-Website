import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import { updateEvent } from "../../actions";
import { EventForm } from "../../event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const isExec = await getIsExec();
  if (!isExec) redirect("/calendar");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("calendar_events")
    .select("title, description, starts_at, ends_at, all_day, course_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const updateAction = updateEvent.bind(null, eventId);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">Edit Event</h1>
      <EventForm action={updateAction} existing={event} submitLabel="Save Changes" />
    </div>
  );
}
