import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

function entityHref(type: string | null, id: string | null) {
  if (!type || !id) return null;
  if (type === "announcement") return `/announcements/${id}`;
  if (type === "assignment") return `/assignments/${id}`;
  return null;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, title, body, related_entity_type, related_entity_id, read_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as NotificationRow[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-normal text-navy">
          Notifications
        </h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-sm text-blue hover:underline"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {notifications.map((n) => {
          const href = entityHref(n.related_entity_type, n.related_entity_id);
          const markAction = markNotificationRead.bind(null, n.id, href);
          const content = (
            <>
              <div className="flex items-center gap-2">
                {!n.read_at && (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden />
                )}
                <p className="text-sm font-medium text-text">{n.title}</p>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}
              <p className="mt-1 text-xs text-muted">
                {new Date(n.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </>
          );

          return (
            <li key={n.id} className={n.read_at ? "" : "bg-pale/40"}>
              {href ? (
                <form action={markAction}>
                  <button
                    type="submit"
                    className="block w-full py-3.5 text-left"
                  >
                    {content}
                  </button>
                </form>
              ) : (
                <div className="py-3.5">{content}</div>
              )}
            </li>
          );
        })}
        {notifications.length === 0 && (
          <li className="py-6 text-sm text-muted">No notifications yet.</li>
        )}
      </ul>
    </div>
  );
}
