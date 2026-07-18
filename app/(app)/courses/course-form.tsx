"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };

export function CourseForm({
  action,
  existingCourses,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  existingCourses: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-5">
      <FormError error={state?.error} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="term_name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Term Name
          </label>
          <input
            id="term_name"
            name="term_name"
            required
            placeholder="Spring 2027"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="starts_on"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Starts
            </label>
            <input
              id="starts_on"
              name="starts_on"
              type="date"
              required
              className="w-full rounded-md border border-hair bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
          <div>
            <label
              htmlFor="ends_on"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Ends
            </label>
            <input
              id="ends_on"
              name="ends_on"
              type="date"
              required
              className="w-full rounded-md border border-hair bg-white px-3 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="course_name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Course Name
          </label>
          <input
            id="course_name"
            name="course_name"
            required
            placeholder="UREC Analyst Program"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <div>
          <label
            htmlFor="course_code"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Course Code (optional)
          </label>
          <input
            id="course_code"
            name="course_code"
            placeholder="UREC101"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
      </div>

      {existingCourses.length > 0 && (
        <div>
          <label
            htmlFor="copy_from"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Copy content from (optional)
          </label>
          <select
            id="copy_from"
            name="copy_from"
            defaultValue=""
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          >
            <option value="">Start empty</option>
            {existingCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Clones assignments, rubrics, modules, pages, quizzes, and
            calendar events (due dates shifted to the new term). People,
            submissions, and grades are not copied. Everything comes in
            as a draft.
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="make_current" className="h-4 w-4" />
        Make this the current term (switches the whole platform over to it)
      </label>

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Create Term + Course
      </SubmitButton>
    </form>
  );
}
