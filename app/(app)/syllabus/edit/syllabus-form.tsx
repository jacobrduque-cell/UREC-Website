"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton, FormError } from "../../ui/form-controls";
import { MarkdownField } from "../../ui/markdown-field";

type FormState = { error?: string };

export function SyllabusForm({
  action,
  defaultBody,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaultBody: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />
      <div>
        <label
          htmlFor="body_markdown"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Syllabus Content (Markdown)
        </label>
        <MarkdownField
          name="body_markdown"
          rows={20}
          defaultValue={defaultBody}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
          placeholder={"## Course Overview\n\nWhat the analyst program covers…\n\n## Grading\n\n- Homework 60%\n- Case studies 25%\n- Participation 15%"}
        />
      </div>

      <div className="flex gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Save Syllabus
        </SubmitButton>
        <Link
          href="/syllabus"
          className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
