import Link from "next/link";
import { utcISOToPacificWallClock } from "@/lib/timezone";
import { MarkdownField } from "../ui/markdown-field";

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

export function AssignmentForm({
  action,
  groups,
  rubrics,
  currentRubricId,
  existing,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  groups: AssignmentGroup[];
  rubrics: Rubric[];
  currentRubricId: string | null;
  existing?: ExistingAssignment;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
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
            defaultValue={toDatetimeLocal(existing?.due_at ?? null)}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <div>
          <label
            htmlFor="unlock_at"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Available from
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
            Closes
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
        Due drives the Late flag; students can submit until <em>Closes</em>{" "}
        (leave blank to keep it open). <em>Available from</em> hides the
        submit box until then.
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

      <button
        type="submit"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        {submitLabel}
      </button>
    </form>
  );
}
