import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { markAllConversationsRead } from "./actions";
import { SubmitButton } from "../ui/form-controls";

type Participant = { user: { id: string; full_name: string | null; email: string } | null };
type Message = { body: string; created_at: string; author_id: string };
type Conversation = {
  id: string;
  subject: string | null;
  created_at: string;
  conversation_participants: Participant[];
  messages: Message[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function InboxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, subject, created_at, conversation_participants(user:users(id, full_name, email)), messages(body, created_at, author_id)",
    );

  // Read state lives on last_read_at, which ships in a separate migration
  // (20260717003400_conversation_read_state.sql). Deploys and migrations
  // land independently, so this is fetched in its OWN query and any failure
  // — most importantly the column not existing yet — falls back to an empty
  // map. An empty map means every conversation is treated as read, so the
  // list renders exactly as before with no unread indicators. It can never
  // crash the page because the main conversations query above never touches
  // the column.
  const lastReadByConversation = new Map<string, string | null>();
  // Only trust the read state when the query actually SUCCEEDS. Pre-migration
  // the column doesn't exist and the query errors — in that case we must treat
  // everything as READ (no indicators), NOT unread. Distinguishing "query
  // failed" from "row's last_read_at is null" matters: once the column exists,
  // a null last_read_at correctly means "never read → unread".
  let readStateAvailable = false;
  try {
    const { data: readRows, error } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    if (!error) {
      readStateAvailable = true;
      for (const r of (readRows ?? []) as {
        conversation_id: string;
        last_read_at: string | null;
      }[]) {
        lastReadByConversation.set(r.conversation_id, r.last_read_at);
      }
    }
  } catch {
    // Column missing pre-migration (or any transient failure): treat all read.
  }

  const conversations = ((data ?? []) as unknown as Conversation[])
    .map((c) => {
      const last = [...c.messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      const others = c.conversation_participants
        .map((p) => p.user)
        .filter((u): u is NonNullable<typeof u> => !!u && u.id !== user.id);
      // Unread = latest message is from someone else AND we either never
      // read the thread or last read it before that message arrived.
      const lastReadAt = lastReadByConversation.get(c.id) ?? null;
      const unread =
        readStateAvailable &&
        !!last &&
        last.author_id !== user.id &&
        (!lastReadAt || new Date(lastReadAt).getTime() < new Date(last.created_at).getTime());
      return { ...c, last, others, unread };
    })
    .sort(
      (a, b) =>
        new Date(b.last?.created_at ?? b.created_at).getTime() -
        new Date(a.last?.created_at ?? a.created_at).getTime(),
    );

  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Inbox</h1>
          <p className="mt-2 text-sm text-muted">
            Direct messages with other members.
            {unreadCount > 0 && (
              <span className="ml-1 font-medium text-navy-deep">
                {unreadCount} unread.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <form action={markAllConversationsRead}>
              <SubmitButton
                pendingText="Marking…"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Mark all read
              </SubmitButton>
            </form>
          )}
          <Link
            href="/inbox/new"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            New Message
          </Link>
        </div>
      </div>

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {conversations.map((c) => {
          const names = c.others.map((u) => u.full_name ?? u.email);
          const label =
            names.length === 0
              ? "You"
              : names.length <= 3
                ? names.join(", ")
                : `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
          return (
            <li key={c.id}>
              <Link
                href={`/inbox/${c.id}`}
                className="flex items-start justify-between gap-4 py-3.5 transition-colors hover:bg-[#eef7ff]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.unread ? "bg-blue" : "bg-transparent"}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm ${c.unread ? "font-semibold text-navy-deep" : "font-medium text-text"}`}
                    >
                      {c.subject || label}
                    </p>
                    <p className={`truncate text-xs ${c.unread ? "font-medium text-text" : "text-muted"}`}>
                      {c.subject ? `${label} · ` : ""}
                      {c.last?.body ?? "No messages yet"}
                    </p>
                  </div>
                </div>
                {c.last && (
                  <span
                    className={`whitespace-nowrap text-xs ${c.unread ? "font-semibold text-navy-deep" : "text-muted"}`}
                  >
                    {fmt(c.last.created_at)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {conversations.length === 0 && (
          <li className="py-6 text-sm text-muted">
            No messages yet. Start one with “New Message”.
          </li>
        )}
      </ul>
    </div>
  );
}
