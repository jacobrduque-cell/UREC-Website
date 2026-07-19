"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { utcISOToPacificWallClock } from "@/lib/timezone";
import { MarkdownField } from "../ui/markdown-field";
import { SubmitButton } from "../ui/form-controls";

type FormState = { error?: string };
type AssignmentGroup = { id: string; name: string };
type Rubric = { id: string; title: string };

type ExistingAssignment = {
  title: string;
  description: string | null;
  points_possible: number;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  submission_type: string;
  accepted_file_types: string[] | null;
  assignment_group_id: string | null;
  published: boolean;
  allow_group_submission: boolean;
};

// Render the stored UTC instant as a Pacific wall-clock string so the
// edit form shows the same time the exec entered — using the local
// server/browser zone here would drift the prefill by the UTC offset.
const toDatetimeLocal = utcISOToPacificWallClock;

// Build a naive "YYYY-MM-DDTHH:mm" wall-clock string from a Date's local
// fields. The server reads datetime-local values as Pacific (see
// lib/timezone.ts), so we deliberately do NOT convert zones here — we
// just serialize the wall-clock digits, matching how the input behaves.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Parse a "YYYY-MM-DDTHH:mm" datetime-local string as local wall clock.
function fromLocalInputValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The upcoming Friday at 5:00 PM. If today is Friday and it's still before
// 5pm, use today; otherwise roll to next Friday.
function upcomingFri5pm(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(17, 0, 0, 0);
  let add = (5 - d.getDay() + 7) % 7; // days until Friday (5)
  if (add === 0 && now.getHours() >= 17) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

// The upcoming Sunday at 11:59 PM. If today is Sunday and it's still
// before 11:59pm, use today; otherwise roll to next Sunday.
function upcomingSun1159pm(): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(23, 59, 0, 0);
  let add = (0 - d.getDay() + 7) % 7; // days until Sunday (0)
  if (add === 0 && (now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 59))) {
    add = 7;
  }
  d.setDate(d.getDate() + add);
  return d;
}

export function AssignmentForm({
  action,
  groups,
  rubrics,
  currentRubricId,
  existing,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  groups: AssignmentGroup[];
  rubrics: Rubric[];
  currentRubricId: string | null;
  existing?: ExistingAssignment;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  // Controlled so the quick-preset chips can fill it in. Seeded from the
  // existing value via the same Pacific-aware helper used for prefill.
  const [dueAt, setDueAt] = useState(toDatetimeLocal(existing?.due_at ?? null));

  // "+1 week" builds off the current Due value if set, else now, and
  // preserves the time of day.
  const plusOneWeek = () => {
    const base = fromLocalInputValue(dueAt) ?? new Date();
    base.setDate(base.getDate() + 7);
    setDueAt(toLocalInputValue(base));
  };

  const duePresets: { label: string; onClick: () => void }[] = [
    { label: "This Fri 5pm", onClick: () => setDueAt(toLocalInputValue(upcomingFri5pm())) },
    { label: "Sun 11:59pm", onClick: () => setDueAt(toLocalInputValue(upcomingSun1159pm())) },
    { label: "+1 week", onClick: plusOneWeek },
    { label: "Clear", onClick: () => setDueAt("") },
  ];

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      {state?.error && (
        <p className="rounded-md border border-neg/30 bg-[#fdecea] px-4 py-2.5 text-sm font-medium text-neg">
          {state.error}
        </p>
      )}
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
          defaultValue={existing?.title}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Description
        </label>
        <MarkdownField
          name="description"
          rows={8}
          defaultValue={existing?.description ?? ""}
          placeholder="Markdown supported. Use **bold**, lists, and Insert image to embed a rent roll, chart, or site map."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="assignment_group_id"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Category
          </label>
          <select
            id="assignment_group_id"
            name="assignment_group_id"
            defaultValue={existing?.assignment_group_id ?? ""}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          >
            <option value="">Ungrouped</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="points_possible"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Points Possible
          </label>
          <input
            id="points_possible"
            name="points_possible"
            type="number"
            min={0}
            step="0.5"
            required
            defaultValue={existing?.points_possible ?? 100}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="due_at"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Due (optional)
          </label>
          <input
            id="due_at"
            name="due_at"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {duePresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={p.onClick}
                className="rounded-md border border-hair px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-[#eef7ff]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            htmlFor="unlock_at"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Available from (optional)
          </label>
          <input
            id="unlock_at"
            name="unlock_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(existing?.unlock_at ?? null)}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <div>
          <label
            htmlFor="lock_at"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Closes (optional)
          </label>
          <input
            id="lock_at"
            name="lock_at"
            type="datetime-local"
            defaultValue={toDatetimeLocal(existing?.lock_at ?? null)}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Most assignments only need a <em>Due</em> date — leave the other two
        blank. <em>Due</em> drives the Late flag; students can submit until{" "}
        <em>Closes</em>, and <em>Available from</em> hides the submit box until
        then. If you do set both, Available&nbsp;from must be earlier than
        Closes.
      </p>

      <div>
        <label
          htmlFor="submission_type"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Submission Type
        </label>
        <select
          id="submission_type"
          name="submission_type"
          defaultValue={existing?.submission_type ?? "text"}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        >
          <option value="text">Text entry</option>
          <option value="url">Website URL</option>
          <option value="file">File upload</option>
          <option value="none">No submission (in-person/other)</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="accepted_file_types"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Accepted File Types (comma-separated, only used for file uploads)
        </label>
        <input
          id="accepted_file_types"
          name="accepted_file_types"
          placeholder="pdf, docx, xlsx"
          defaultValue={existing?.accepted_file_types?.join(", ") ?? ""}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      <div>
        <label
          htmlFor="rubric_id"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Rubric (optional)
        </label>
        <select
          id="rubric_id"
          name="rubric_id"
          defaultValue={currentRubricId ?? ""}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        >
          <option value="">No rubric</option>
          {rubrics.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <Link
          href="/assignments/rubrics"
          className="mt-1.5 inline-block text-xs text-blue hover:underline"
        >
          Manage rubrics &rarr;
        </Link>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="allow_group_submission"
          defaultChecked={existing?.allow_group_submission ?? false}
          className="h-4 w-4"
        />
        Group submission (submit and grade once per group instead of
        once per person — see Directory &rarr; Manage Groups)
      </label>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="published"
          defaultChecked={existing?.published ?? false}
          className="h-4 w-4"
        />
        Published (visible to students — notifies the course when this
        flips from off to on)
      </label>

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
