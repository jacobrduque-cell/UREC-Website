"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../../ui/form-controls";

type FormState = { error?: string };

// Match the 10 rows createRubric reads from the form (it loops i < 10);
// rendering only 6 silently capped execs at 6 criteria.
const criterionRows = Array.from({ length: 10 });

export function RubricForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-5">
      <FormError error={state?.error} />
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Rubric Title
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Criteria (leave rows blank to skip)
        </p>
        {criterionRows.map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_5rem] gap-2">
            <input
              name={`criterion_${i}`}
              placeholder="Criterion"
              className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
            />
            <input
              name={`description_${i}`}
              placeholder="Description"
              className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
            />
            <input
              name={`points_${i}`}
              type="number"
              min={0}
              step="0.5"
              placeholder="Pts"
              className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
            />
          </div>
        ))}
      </div>

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Create Rubric
      </SubmitButton>
    </form>
  );
}
