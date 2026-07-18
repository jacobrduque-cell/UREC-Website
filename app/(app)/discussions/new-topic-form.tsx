"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };

export function NewTopicForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <FormError error={state?.error} />
      <input
        name="title"
        required
        placeholder="Topic title"
        className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
      />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="What do you want to discuss?"
        className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
      />
      <SubmitButton
        pendingText="Posting…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Post Topic
      </SubmitButton>
    </form>
  );
}
