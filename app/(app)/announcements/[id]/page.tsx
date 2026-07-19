import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createReply, deleteAnnouncement } from "../actions";
import { ConfirmSubmitButton } from "../../ui/form-controls";
import { CopyLinkButton } from "../../ui/copy-link-button";
import { ReplyForm } from "../reply-form";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  published_at: string | null;
  author: { full_name: string | null; email: string } | null;
};

type Reply = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
};

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const isExec = await getIsExec();

  const [{ data: announcement }, { data: replies }] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, title, body, pinned, locked, published_at, author:users(full_name, email)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("announcement_replies")
      .select("id, body, created_at, author:users(full_name, email)")
      .eq("announcement_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!announcement) {
    notFound();
  }

  const a = announcement as unknown as Announcement;
  const replyList = (replies ?? []) as unknown as Reply[];
  const replyAction = createReply.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link href="/announcements" className="text-sm text-blue hover:underline">
        &larr; Back to Announcements
      </Link>

      <div className="mt-4 flex items-center gap-2">
        {a.pinned && (
          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
            Pinned
          </span>
        )}
        {a.locked && (
          <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Locked
          </span>
        )}
        <h1 className="font-display text-2xl font-bold text-navy-deep">
          {a.title}
        </h1>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {a.author?.full_name ?? a.author?.email ?? "Unknown"} &middot;{" "}
        {fmt(a.published_at)}
      </p>

      {isExec && (
        <div className="mt-3 flex items-center gap-3">
          <Link
            href={`/announcements/${a.id}/edit`}
            className="text-xs font-medium text-blue hover:underline"
          >
            Edit
          </Link>
          <form action={deleteAnnouncement.bind(null, a.id)}>
            <ConfirmSubmitButton
              message={`Delete "${a.title}"? This removes it and all its replies for everyone.`}
              className="text-xs font-medium text-neg hover:underline"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
          <CopyLinkButton className="text-xs font-medium text-blue hover:underline" />
        </div>
      )}

      <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-text">
        {a.body}
      </p>

      <div className="mt-10 border-t border-hair pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {replyList.length} {replyList.length === 1 ? "Reply" : "Replies"}
        </h2>

        <ul className="mt-4 flex flex-col gap-4">
          {replyList.map((r) => (
            <li key={r.id} className="rounded-md border border-hair bg-white p-4">
              <p className="text-sm text-text">{r.body}</p>
              <p className="mt-2 text-xs text-muted">
                {r.author?.full_name ?? r.author?.email ?? "Unknown"} &middot;{" "}
                {fmt(r.created_at)}
              </p>
            </li>
          ))}
        </ul>

        {a.locked && !isExec ? (
          <p className="mt-6 text-sm text-muted">
            Replies are locked on this announcement.
          </p>
        ) : (
          <ReplyForm action={replyAction} />
        )}
      </div>
    </div>
  );
}
