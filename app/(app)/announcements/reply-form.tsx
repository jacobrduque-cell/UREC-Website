"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };

export function ReplyForm({
  action,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <FormError error={state?.error} />
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Write a reply…"
        className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
      />
      <SubmitButton
        pendingText="Posting…"
        className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Reply
      </SubmitButton>
    </form>
  );
}
