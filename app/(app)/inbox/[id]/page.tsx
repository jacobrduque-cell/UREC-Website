import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { sendMessage } from "../actions";
import { SubmitButton } from "../../ui/form-controls";

type Participant = { user: { id: string; full_name: string | null; email: string } | null };
type Message = { id: string; body: string; created_at: string; author_id: string };
type Conversation = {
  id: string;
  subject: string | null;
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

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, subject, conversation_participants(user:users(id, full_name, email)), messages(id, body, created_at, author_id)",
    )
    .eq("id", id)
    .maybeSingle();
  // RLS returns nothing if the viewer isn't a participant.
  if (!data) notFound();

  const convo = data as unknown as Conversation;
  const byId = new Map(
    convo.conversation_participants
      .map((p) => p.user)
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => [u.id, u]),
  );
  const others = [...byId.values()].filter((u) => u.id !== user.id);
  const messages = [...convo.messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const replyAction = sendMessage.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Link href="/inbox" className="text-sm text-blue hover:underline">
        &larr; Back to Inbox
      </Link>

      <h1 className="mt-4 font-display text-xl font-bold text-navy-deep">
        {convo.subject || others.map((u) => u.full_name ?? u.email).join(", ") || "Conversation"}
      </h1>
      <p className="mt-1 text-xs text-muted">
        With {others.map((u) => u.full_name ?? u.email).join(", ") || "just you"}
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {messages.map((m) => {
          const mine = m.author_id === user.id;
          const author = byId.get(m.author_id);
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${mine ? "bg-blue text-white" : "border border-hair bg-white text-text"}`}
              >
                {!mine && (
                  <p className="mb-0.5 text-xs font-medium text-muted">
                    {author?.full_name ?? author?.email ?? "Unknown"}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                  {fmt(m.created_at)}
                </p>
              </div>
            </li>
          );
        })}
        {messages.length === 0 && (
          <li className="text-sm text-muted">No messages yet.</li>
        )}
      </ul>

      <form action={replyAction} className="mt-6 flex flex-col gap-3">
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Write a reply…"
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
        <SubmitButton
          pendingText="Sending…"
          className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Send
        </SubmitButton>
      </form>
    </div>
  );
}
