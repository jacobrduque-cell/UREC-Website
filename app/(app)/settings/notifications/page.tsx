import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveNotificationPrefs } from "./actions";

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

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prefRows } = await supabase
    .from("notification_prefs")
    .select("type, channel")
    .eq("user_id", user.id);
  const current = new Map(
    ((prefRows ?? []) as { type: string; channel: string }[]).map((p) => [p.type, p.channel]),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <h1 className="font-display text-2xl font-bold text-navy-deep">Notification Settings</h1>
      <p className="mt-2 text-sm text-muted">
        Choose how you hear about each kind of update. Email also shows in-app; the default is
        email.
      </p>

      <form action={saveNotificationPrefs} className="mt-8 flex flex-col gap-5">
        {TYPES.map((t) => {
          const val = current.get(t.type) ?? "email";
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

        <button
          type="submit"
          className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Save preferences
        </button>
      </form>
    </div>
  );
}
