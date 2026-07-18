"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { SubmitButton, FormError } from "../ui/form-controls";

type FormState = { error?: string };
type BoundAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/** A single add-item form: wires useActionState + inline error banner. */
function ItemForm({
  action,
  className,
  children,
}: {
  action: BoundAction;
  className: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      <FormError error={state?.error} />
      {children}
    </form>
  );
}

export function AddItemForm({
  action,
  assignments,
  pages,
  quizzes,
}: {
  action: BoundAction;
  assignments: { id: string; title: string }[];
  pages: { id: string; title: string }[];
  quizzes: { id: string; title: string }[];
}) {
  return (
    <details className="border-t border-hair bg-[#fafbfb]">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-sky">
        + Add item
      </summary>
      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <ItemForm action={action} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="assignment" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Assignment</label>
          <select name="ref_id" required className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <SubmitButton pendingText="Adding…" className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</SubmitButton>
        </ItemForm>

        <ItemForm action={action} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="page" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Page</label>
          <select name="ref_id" required className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <SubmitButton pendingText="Adding…" className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</SubmitButton>
        </ItemForm>

        <ItemForm action={action} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="quiz" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Quiz</label>
          <select name="ref_id" required className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue">
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
          <SubmitButton pendingText="Adding…" className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</SubmitButton>
        </ItemForm>

        <ItemForm action={action} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3">
          <input type="hidden" name="item_type" value="url" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">External link</label>
          <input name="title" required placeholder="Link text" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
          <input name="url" type="url" required placeholder="https://…" className="rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
          <SubmitButton pendingText="Adding…" className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</SubmitButton>
        </ItemForm>

        <ItemForm action={action} className="flex flex-col gap-2 rounded-md border border-hair bg-white p-3 sm:col-span-2">
          <input type="hidden" name="item_type" value="header" />
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Text header (section label)</label>
          <div className="flex gap-2">
            <input name="title" required placeholder="e.g. Readings" className="flex-1 rounded-md border border-hair px-2 py-1.5 text-sm outline-none focus:border-blue" />
            <SubmitButton pendingText="Adding…" className="rounded-md border border-hair px-3 py-1 text-xs font-medium text-text hover:bg-[#eef7ff]">Add</SubmitButton>
          </div>
        </ItemForm>
      </div>
    </details>
  );
}
