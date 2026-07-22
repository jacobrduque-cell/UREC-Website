"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../../ui/form-controls";

/**
 * Quiz behavior settings form. Server-action failures come back through
 * useActionState and render inline in the FormError banner instead of
 * bouncing the exec to the generic error page.
 */
export function QuizSettingsForm({
  action,
  shuffleQuestions,
  showCorrectAfter,
  proctored,
  categories,
  assignmentGroupId,
}: {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  shuffleQuestions: boolean;
  showCorrectAfter: boolean;
  proctored: boolean;
  categories: { id: string; name: string }[];
  assignmentGroupId: string | null;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-hair px-4 py-4">
      <FormError error={state?.error} />
      <label className="flex flex-col gap-1 text-sm text-text">
        <span>
          Grade category
          <span className="mt-0.5 block text-xs text-muted">
            Count this quiz&rsquo;s score toward a weighted category. Leave unassigned to keep it out of grades.
          </span>
        </span>
        <select
          name="assignment_group_id"
          defaultValue={assignmentGroupId ?? ""}
          className="mt-1 w-full max-w-xs rounded-md border border-hair bg-white px-2.5 py-1.5 text-sm text-text outline-none focus:border-blue"
        >
          <option value="">Not counted</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="shuffle_questions" defaultChecked={shuffleQuestions} className="h-4 w-4" />
        Shuffle question <em>and</em> answer order for each member
      </label>
      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" name="show_correct_after" defaultChecked={showCorrectAfter} className="h-4 w-4" />
        Show correct answers &amp; explanations after a member submits
      </label>
      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" name="proctored" defaultChecked={proctored} className="mt-0.5 h-4 w-4" />
        <span>
          Integrity mode
          <span className="mt-0.5 block text-xs text-muted">
            Runs the quiz in fullscreen, records if a member leaves the tab or
            exits fullscreen (shown to you on Submissions), and blocks
            copy/paste. Detects &amp; deters — it can&rsquo;t fully prevent.
          </span>
        </span>
      </label>
      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-sky"
      >
        Save settings
      </SubmitButton>
    </form>
  );
}
