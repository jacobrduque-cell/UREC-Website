"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton, FormError } from "../../ui/form-controls";
import { MarkdownField } from "../../ui/markdown-field";

type FormState = { error?: string };

export function HomeForm({
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
          Front Page Content (Markdown)
        </label>
        <MarkdownField
          name="body_markdown"
          rows={18}
          defaultValue={defaultBody}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
          placeholder={"# Welcome to the UREC Analyst Program\n\nWhat this program is, what to expect, and where to start.\n\n## Getting Started\n\n1. Read the Syllabus\n2. Check the first Module\n3. Introduce yourself in Discussions"}
        />
      </div>

      <div className="flex gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Save Front Page
        </SubmitButton>
        <Link
          href="/home"
          className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
