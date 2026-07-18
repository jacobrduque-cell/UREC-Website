import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createDiscussionReply } from "../actions";
import { SubmitButton } from "../../ui/form-controls";

type Topic = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
};
type Reply = {
  id: string;
  body: string;
  parent_reply_id: string | null;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: topic }, { data: replies }] = await Promise.all([
    supabase
      .from("discussion_topics")
      .select("id, title, body, created_at, author:users(full_name, email)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("discussion_replies")
      .select("id, body, parent_reply_id, created_at, author:users(full_name, email)")
      .eq("discussion_topic_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!topic) notFound();

  const t = topic as unknown as Topic;
  const allReplies = (replies ?? []) as unknown as Reply[];
  const topLevel = allReplies.filter((r) => !r.parent_reply_id);
  const childrenOf = (parentId: string) =>
    allReplies.filter((r) => r.parent_reply_id === parentId);

  const rootReplyAction = createDiscussionReply.bind(null, id, null);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Link href="/discussions" className="text-sm text-blue hover:underline">
        &larr; Back to Discussions
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        {t.title}
      </h1>
      <p className="mt-1 text-xs text-muted">
        {t.author?.full_name ?? t.author?.email ?? "Unknown"} &middot; {fmt(t.created_at)}
      </p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
        {t.body}
      </p>

      <div className="mt-8 border-t border-hair pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {allReplies.length} {allReplies.length === 1 ? "Reply" : "Replies"}
        </h2>

        <ul className="mt-4 flex flex-col gap-4">
          {topLevel.map((r) => (
            <li key={r.id}>
              <ReplyCard reply={r} topicId={id} />
              {childrenOf(r.id).length > 0 && (
                <ul className="mt-3 flex flex-col gap-3 border-l-2 border-hair pl-4">
                  {childrenOf(r.id).map((child) => (
                    <li key={child.id}>
                      <ReplyCard reply={child} topicId={id} allowNesting={false} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <form action={rootReplyAction} className="mt-6 flex flex-col gap-3">
          <textarea
            name="body"
            required
            rows={3}
            placeholder="Add a reply…"
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
          <SubmitButton
            pendingText="Posting…"
            className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Reply
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

function ReplyCard({
  reply,
  topicId,
  allowNesting = true,
}: {
  reply: Reply;
  topicId: string;
  allowNesting?: boolean;
}) {
  const nestedAction = createDiscussionReply.bind(null, topicId, reply.id);
  return (
    <div className="rounded-md border border-hair bg-white p-4">
      <p className="text-sm text-text">{reply.body}</p>
      <p className="mt-2 text-xs text-muted">
        {reply.author?.full_name ?? reply.author?.email ?? "Unknown"} &middot;{" "}
        {fmt(reply.created_at)}
      </p>
      {allowNesting && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-sky">Reply</summary>
          <form action={nestedAction} className="mt-2 flex flex-col gap-2">
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Reply to this…"
              className="w-full rounded-md border border-hair bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-blue"
            />
            <SubmitButton
              pendingText="Posting…"
              className="self-start rounded-md border border-hair px-3 py-1 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Post reply
            </SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}
