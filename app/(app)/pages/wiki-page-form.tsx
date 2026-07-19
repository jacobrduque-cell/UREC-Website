"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { SubmitButton, FormError } from "../ui/form-controls";
import { MarkdownField } from "../ui/markdown-field";

type FormState = { error?: string };

export function WikiPageForm({
  action,
  existing,
  submitLabel,
  cancelHref,
  publishLabel,
  bodyPlaceholder,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  existing?: { title: string; body_markdown: string; published: boolean };
  submitLabel: string;
  cancelHref: string;
  publishLabel: ReactNode;
  bodyPlaceholder?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={existing?.title}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </div>

      <div>
        <label
          htmlFor="body_markdown"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          Content (Markdown)
        </label>
        <MarkdownField
          name="body_markdown"
          rows={16}
          defaultValue={existing?.body_markdown ?? ""}
          placeholder={bodyPlaceholder}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="published"
          defaultChecked={existing?.published}
          className="h-4 w-4"
        />
        {publishLabel}
      </label>

      <div className="flex gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          {submitLabel}
        </SubmitButton>
        <Link
          href={cancelHref}
          className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
