import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveNotificationPrefs } from "./actions";
import { NotificationPrefsForm } from "./notification-prefs-form";

export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
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

      {saved && (
        <p className="mt-4 rounded-md border border-pos/30 bg-[#e6f4ea] px-4 py-2.5 text-sm font-medium text-pos">
          Preferences saved.
        </p>
      )}

      <NotificationPrefsForm action={saveNotificationPrefs} current={Object.fromEntries(current)} />
    </div>
  );
}
