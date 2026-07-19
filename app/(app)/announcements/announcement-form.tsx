"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SubmitButton, FormError } from "../ui/form-controls";
import { MarkdownField } from "../ui/markdown-field";

type FormState = { error?: string };

const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const field =
  "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue";

export function AnnouncementForm({
  action,
  mode,
  cancelHref,
  defaults,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  cancelHref: string;
  defaults?: { title: string; body: string; pinned: boolean; locked: boolean };
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />

      <div>
        <label htmlFor="title" className={label}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults?.title}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="body" className={label}>
          Message
        </label>
        <MarkdownField
          name="body"
          rows={8}
          defaultValue={defaults?.body ?? ""}
          className={field}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="pinned"
          defaultChecked={defaults?.pinned}
          className="h-4 w-4"
        />
        Pin to the top
      </label>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          name="locked"
          defaultChecked={defaults?.locked}
          className="h-4 w-4"
        />
        Lock replies (post as announcement-only, no discussion)
      </label>

      {mode === "create" ? (
        <div>
          <label htmlFor="publish_at" className={label}>
            Publish (leave blank to post immediately)
          </label>
          <input
            id="publish_at"
            name="publish_at"
            type="datetime-local"
            className={field}
          />
          <p className="mt-1 text-xs text-muted">
            Scheduled for later: hidden from members and no notification until
            then.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Editing doesn&rsquo;t re-notify members — it&rsquo;s a correction, not
          a new post.
        </p>
      )}

      <div className="flex gap-3">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          {mode === "create" ? "Post" : "Save Changes"}
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
