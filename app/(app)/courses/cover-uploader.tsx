"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };

// Exec control (courses admin) to set/replace/remove a course's cover
// image. The preview shows the exact film treatment the card uses: the
// image with the course color laid over it at partial opacity.
export function CoverUploader({
  action,
  clearAction,
  currentUrl,
  color,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clearAction: () => void | Promise<void>;
  currentUrl: string | null;
  color: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <div className="mt-2 rounded-md border border-hair bg-paper-warm p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded"
          style={{ backgroundColor: color }}
        >
          {currentUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span
                className="absolute inset-0"
                style={{ backgroundColor: color, opacity: 0.55, mixBlendMode: "multiply" }}
              />
            </>
          )}
        </span>

        <form action={formAction} className="flex flex-1 flex-wrap items-center gap-2">
          <input
            type="file"
            name="cover"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="max-w-[190px] text-xs text-muted file:mr-2 file:rounded file:border-0 file:bg-blue file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-white"
          />
          <SubmitButton
            pendingText="Uploading…"
            className="whitespace-nowrap rounded-md border border-hair px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            {currentUrl ? "Replace" : "Set cover"}
          </SubmitButton>
        </form>

        {currentUrl && (
          <form action={clearAction}>
            <button
              type="submit"
              className="rounded-md px-2 py-1.5 text-xs font-medium text-neg transition-colors hover:underline"
            >
              Remove
            </button>
          </form>
        )}
      </div>
      <FormError error={state?.error} />
    </div>
  );
}
