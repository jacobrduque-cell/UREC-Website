"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../../ui/form-controls";

type FormState = { error?: string };

export function SectionForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <FormError error={state?.error} />
      <div className="flex gap-3">
        <input
          name="name"
          required
          placeholder="e.g. Tuesday Cohort"
          className="flex-1 rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
        <SubmitButton
          pendingText="Creating…"
          className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Create Section
        </SubmitButton>
      </div>
    </form>
  );
}
