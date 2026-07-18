"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "../../ui/form-controls";

type FormState = { error?: string };

const TYPES: { type: string; label: string; desc: string }[] = [
  { type: "new_announcement", label: "Announcements", desc: "When exec posts an announcement" },
  { type: "new_assignment", label: "New assignments", desc: "When an assignment is published" },
  { type: "assignment_graded", label: "Grades & feedback", desc: "When your work is graded or commented on" },
  { type: "assignment_due_soon", label: "Due-date reminders", desc: "The day before something is due" },
];

const CHANNELS: { value: string; label: string }[] = [
  { value: "email", label: "Email + in-app" },
  { value: "in_app", label: "In-app only" },
  { value: "off", label: "Off" },
];

export function NotificationPrefsForm({
  action,
  current,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  current: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <FormError error={state?.error} />

      {TYPES.map((t) => {
        const val = current[t.type] ?? "email";
        return (
          <div key={t.type} className="rounded-md border border-hair bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-text">{t.label}</p>
                <p className="text-xs text-muted">{t.desc}</p>
              </div>
              <div className="flex flex-shrink-0 gap-1">
                {CHANNELS.map((c) => (
                  <label
                    key={c.value}
                    className="cursor-pointer rounded-md border border-hair px-3 py-1.5 text-xs text-muted transition-colors has-[:checked]:border-blue has-[:checked]:bg-pale has-[:checked]:font-medium has-[:checked]:text-sky"
                  >
                    <input
                      type="radio"
                      name={`channel_${t.type}`}
                      value={c.value}
                      defaultChecked={val === c.value}
                      className="sr-only"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <SubmitButton
        pendingText="Saving…"
        className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
      >
        Save preferences
      </SubmitButton>
    </form>
  );
}
