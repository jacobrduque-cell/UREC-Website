"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };

export function NewFolderForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <FormError error={state?.error} />
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="New folder name"
          required
          className="rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
        />
        <SubmitButton
          pendingText="Creating…"
          className="rounded-md border border-navy px-4 py-2 text-xs font-medium text-navy transition-colors hover:bg-navy hover:text-white"
        >
          New Folder
        </SubmitButton>
      </div>
    </form>
  );
}
