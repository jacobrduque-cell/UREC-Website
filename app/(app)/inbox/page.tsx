import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

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

  const conversations = ((data ?? []) as unknown as Conversation[])
    .map((c) => {
      const last = [...c.messages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      const others = c.conversation_participants
        .map((p) => p.user)
        .filter((u): u is NonNullable<typeof u> => !!u && u.id !== user.id);
      return { ...c, last, others };
    })
    .sort(
      (a, b) =>
        new Date(b.last?.created_at ?? b.created_at).getTime() -
        new Date(a.last?.created_at ?? a.created_at).getTime(),
    );

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Inbox</h1>
          <p className="mt-2 text-sm text-muted">Direct messages with other members.</p>
        </div>
        <Link
          href="/inbox/new"
          className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          New Message
        </Link>
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {c.subject || label}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {c.subject ? `${label} · ` : ""}
                    {c.last?.body ?? "No messages yet"}
                  </p>
                </div>
                {c.last && (
                  <span className="whitespace-nowrap text-xs text-muted">
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
