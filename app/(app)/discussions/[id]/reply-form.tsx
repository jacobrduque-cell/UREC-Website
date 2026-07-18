"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../../ui/form-controls";

type FormState = { error?: string };

export function ReplyForm({
  action,
  rows,
  placeholder,
  submitLabel,
  formClassName,
  textareaClassName,
  buttonClassName,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  rows: number;
  placeholder: string;
  submitLabel: string;
  formClassName: string;
  textareaClassName: string;
  buttonClassName: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className={formClassName}>
      <FormError error={state?.error} />
      <textarea
        name="body"
        required
        rows={rows}
        placeholder={placeholder}
        className={textareaClassName}
      />
      <SubmitButton pendingText="Posting…" className={buttonClassName}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
