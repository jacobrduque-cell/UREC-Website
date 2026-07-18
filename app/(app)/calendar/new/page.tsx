import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createEvent } from "../actions";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/calendar");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">New Event</h1>
      <EventForm action={createEvent} submitLabel="Create Event" />
    </div>
  );
}
