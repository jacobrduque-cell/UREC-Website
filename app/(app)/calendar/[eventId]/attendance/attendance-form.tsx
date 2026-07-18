"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../../../ui/form-controls";

type FormState = { error?: string };

type Student = {
  id: string;
  name: string;
  sectionName: string | null;
};

const STATUSES = ["present", "late", "excused", "absent"] as const;
const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

export function AttendanceForm({
  action,
  students,
  current,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  students: Student[];
  current: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-6">
      <FormError error={state?.error} />

      <ul className="divide-y divide-hair border-t border-hair">
        {students.map((s) => {
          const val = current[s.id] ?? "";
          return (
            <li
              key={s.id}
              className="flex flex-col items-start gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{s.name}</p>
                {s.sectionName && (
                  <p className="truncate text-xs text-muted">{s.sectionName}</p>
                )}
              </div>
              <div
                className="flex flex-wrap gap-1 sm:flex-shrink-0"
                role="radiogroup"
                aria-label="Status"
              >
                {STATUSES.map((st) => (
                  <label
                    key={st}
                    className="cursor-pointer rounded-md border border-hair px-2.5 py-1 text-xs text-muted transition-colors has-[:checked]:border-blue has-[:checked]:bg-pale has-[:checked]:font-medium has-[:checked]:text-sky"
                  >
                    <input
                      type="radio"
                      name={`status_${s.id}`}
                      value={st}
                      defaultChecked={val === st}
                      className="sr-only"
                    />
                    {STATUS_LABEL[st]}
                  </label>
                ))}
              </div>
            </li>
          );
        })}
        {students.length === 0 && (
          <li className="py-6 text-sm text-muted">No one enrolled in this course yet.</li>
        )}
      </ul>

      {students.length > 0 && (
        <SubmitButton
          pendingText="Saving…"
          className="mt-6 rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Save attendance
        </SubmitButton>
      )}
    </form>
  );
}
