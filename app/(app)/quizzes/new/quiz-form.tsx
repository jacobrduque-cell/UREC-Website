"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../../ui/form-controls";

/**
 * Create-quiz form. Server-action failures come back through
 * useActionState and render inline in the FormError banner instead of
 * bouncing the exec to the generic error page.
 */
export function QuizForm({
  action,
}: {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />
      <div>
        <label htmlFor="title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
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
        <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>
      <SubmitButton
        pendingText="Creating…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Create Quiz &amp; Add Questions
      </SubmitButton>
    </form>
  );
}
