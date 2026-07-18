import Link from "next/link";
import { utcISOToPacificWallClock } from "@/lib/timezone";
import { SubmitButton } from "../ui/form-controls";

type ExistingEvent = {
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  course_id: string | null;
};

const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const field = "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue";

export function EventForm({
  action,
  existing,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  existing?: ExistingEvent;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="title" className={label}>Title</label>
        <input id="title" name="title" required defaultValue={existing?.title ?? ""} className={field} />
      </div>

      <div>
        <label htmlFor="description" className={label}>Description (optional)</label>
        <textarea id="description" name="description" rows={3} defaultValue={existing?.description ?? ""} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="starts_at" className={label}>Starts</label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={utcISOToPacificWallClock(existing?.starts_at ?? null)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ends_at" className={label}>Ends (optional)</label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={utcISOToPacificWallClock(existing?.ends_at ?? null)}
            className={field}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="all_day" defaultChecked={existing?.all_day ?? false} className="h-4 w-4" />
        All day
      </label>

      <div>
        <label htmlFor="scope" className={label}>Visibility</label>
        <select
          id="scope"
          name="scope"
          defaultValue={existing ? (existing.course_id === null ? "platform" : "course") : "course"}
          className={field}
        >
          <option value="course">This course only</option>
          <option value="platform">Everyone (platform-wide)</option>
        </select>
      </div>

      <div className="flex gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          {submitLabel}
        </SubmitButton>
        <Link
          href="/calendar"
          className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
