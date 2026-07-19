"use client";

import { useFormStatus } from "react-dom";

/**
 * Publish / Unpublish buttons for a list's bulk-select form. Lives INSIDE
 * the <form> so useFormStatus reflects its pending state; each button
 * submits that same form to a different bound server action via
 * formAction, carrying the checked `ids`. The server action ignores an
 * empty selection, so clicking with nothing checked is a harmless no-op.
 */
export function BulkPublishBar({
  publishAction,
  unpublishAction,
  noun = "selected",
}: {
  publishAction: (formData: FormData) => void | Promise<void>;
  unpublishAction: (formData: FormData) => void | Promise<void>;
  noun?: string;
}) {
  const { pending } = useFormStatus();
  const btn =
    "rounded-md border border-hair px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-60";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>With {noun}:</span>
      <button type="submit" formAction={publishAction} disabled={pending} className={btn}>
        {pending ? "Working…" : "Publish"}
      </button>
      <button type="submit" formAction={unpublishAction} disabled={pending} className={btn}>
        {pending ? "Working…" : "Unpublish"}
      </button>
    </div>
  );
}
