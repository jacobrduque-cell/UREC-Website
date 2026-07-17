import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createEvent } from "../actions";

export default async function NewEventPage() {
  const isExec = await getIsExec();
  if (!isExec) {
    redirect("/calendar");
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">
        New Event
      </h1>

      <form action={createEvent} className="mt-8 flex flex-col gap-5">
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
            htmlFor="description"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="starts_at"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Starts
            </label>
            <input
              id="starts_at"
              name="starts_at"
              type="datetime-local"
              required
              className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label
              htmlFor="ends_at"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Ends (optional)
            </label>
            <input
              id="ends_at"
              name="ends_at"
              type="datetime-local"
              className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="all_day" className="h-4 w-4" />
          All day
        </label>

        <div>
          <label
            htmlFor="scope"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Visibility
          </label>
          <select
            id="scope"
            name="scope"
            defaultValue="course"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          >
            <option value="course">This course only</option>
            <option value="platform">Everyone (platform-wide)</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
          >
            Create Event
          </button>
          <Link
            href="/calendar"
            className="rounded-full border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-hair"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
