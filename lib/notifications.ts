import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailEnabled, sendEmails, notificationHtml } from "@/lib/email";

type NotificationType =
  | "new_announcement"
  | "new_assignment"
  | "assignment_graded"
  | "assignment_due_soon";

// Best-effort deep link per notification type so the email's button lands
// somewhere useful rather than always the dashboard.
function linkForType(type: NotificationType): string {
  switch (type) {
    case "new_announcement":
      return "/announcements";
    case "new_assignment":
    case "assignment_due_soon":
      return "/assignments";
    case "assignment_graded":
      return "/grades";
    default:
      return "/dashboard";
  }
}

/**
 * Notifications are written with the admin client (service role),
 * bypassing RLS on purpose — a notification is always created on
 * someone else's behalf (the poster isn't the recipient), and
 * `public.notifications` has no client-side insert policy at all for
 * exactly that reason (see 20260717000100_rls_policies.sql).
 *
 * After recording the in-app rows, it also emails each recipient — but
 * only when RESEND_API_KEY is configured; otherwise email silently
 * no-ops so the platform runs fine without a vendor. Email failures are
 * caught and never break the action that triggered the notification.
 */
export async function notifyUsers(
  userIds: string[],
  notification: {
    type: NotificationType;
    title: string;
    body?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  },
) {
  if (userIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? null,
      related_entity_type: notification.relatedEntityType ?? null,
      related_entity_id: notification.relatedEntityId ?? null,
    })),
  );

  if (!emailEnabled()) return;
  try {
    const { data: recipients } = await admin
      .from("users")
      .select("email")
      .in("id", userIds);
    const html = notificationHtml({
      title: notification.title,
      body: notification.body,
      linkPath: linkForType(notification.type),
    });
    await sendEmails(
      (recipients ?? [])
        .map((r) => r.email as string)
        .filter(Boolean)
        .map((email) => ({ to: email, subject: notification.title, html })),
    );
  } catch (e) {
    console.error("notifyUsers email step failed:", e);
  }
}

/**
 * Everyone who can actually see this course — enrolled members plus
 * account-level exec (who bypass enrollment via is_exec() in RLS, see
 * courses_select_enrolled_or_exec). Matches the real visibility model
 * rather than just the enrollments table.
 */
export async function getCourseMemberIds(courseId: string, excludeUserId?: string) {
  const admin = createAdminClient();

  const { data: execRoleRows } = await admin
    .from("roles")
    .select("id")
    .in("name", ["Admin", "Co-President", "VP"]);
  const execRoleIds = (execRoleRows ?? []).map((r) => r.id as string);

  const [{ data: enrollments }, { data: execRoles }] = await Promise.all([
    admin.from("enrollments").select("user_id").eq("course_id", courseId),
    execRoleIds.length > 0
      ? admin.from("account_roles").select("user_id").in("role_id", execRoleIds)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);

  const ids = new Set<string>();
  for (const e of enrollments ?? []) ids.add(e.user_id as string);
  for (const r of execRoles ?? []) ids.add(r.user_id as string);
  if (excludeUserId) ids.delete(excludeUserId);
  return [...ids];
}
