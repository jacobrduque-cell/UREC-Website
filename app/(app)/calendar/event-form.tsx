"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { utcISOToPacificWallClock } from "@/lib/timezone";
import { SubmitButton, FormError, FieldError } from "../ui/form-controls";

type FormState = { error?: string };

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
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  existing?: ExistingEvent;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [startsAt, setStartsAt] = useState(
    utcISOToPacificWallClock(existing?.starts_at ?? null),
  );
  const [endsAt, setEndsAt] = useState(
    utcISOToPacificWallClock(existing?.ends_at ?? null),
  );

  // Immediate, under-the-field feedback the moment both ends are set and
  // the range is backwards — before the exec ever clicks the button.
  const endBeforeStart =
    startsAt && endsAt && new Date(endsAt) < new Date(startsAt);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />

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
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ends_at" className={label}>Ends (optional)</label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            aria-invalid={endBeforeStart ? true : undefined}
            className={field}
          />
          {endBeforeStart && (
            <FieldError>The end time can&rsquo;t be before the start time.</FieldError>
          )}
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
          disabled={Boolean(endBeforeStart)}
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
