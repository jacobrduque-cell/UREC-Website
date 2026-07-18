"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../ui/form-controls";

type FormState = { error?: string };
type Section = { id: string; name: string };

export function SectionAssignForm({
  action,
  sections,
  currentSectionId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  sections: Section[];
  currentSectionId: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <select
          name="section_id"
          defaultValue={currentSectionId}
          className="rounded-md border border-hair bg-white px-2 py-1 text-xs text-text outline-none focus:border-blue"
        >
          <option value="">No section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <SubmitButton
          pendingText="Saving…"
          className="whitespace-nowrap rounded-md border border-hair px-2 py-1 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Save
        </SubmitButton>
      </div>
      <FormError error={state?.error} />
    </form>
  );
}
