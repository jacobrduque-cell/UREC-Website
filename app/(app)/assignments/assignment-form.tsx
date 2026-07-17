import Link from "next/link";

type AssignmentGroup = { id: string; name: string };
type Rubric = { id: string; title: string };

type ExistingAssignment = {
  title: string;
  description: string | null;
  points_possible: number;
  due_at: string | null;
  submission_type: string;
  accepted_file_types: string[] | null;
  assignment_group_id: string | null;
  published: boolean;
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
        <label
          htmlFor="description"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Description (HTML — headings/paragraphs/lists render via the same
          rich-content style as everywhere else)
        </label>
        <textarea
          id="description"
          name="description"
          rows={8}
          defaultValue={existing?.description ?? ""}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
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
          name="published"
          defaultChecked={existing?.published ?? false}
          className="h-4 w-4"
        />
        Published (visible to students — notifies the course when this
        flips from off to on)
      </label>

      <button
        type="submit"
        className="self-start rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
      >
        {submitLabel}
      </button>
    </form>
  );
}
