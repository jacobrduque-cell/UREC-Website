import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createReply } from "../actions";

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
  return new Date(iso).toLocaleString("en-US", {
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
        <h1 className="font-display text-2xl font-normal text-navy">
          {a.title}
        </h1>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {a.author?.full_name ?? a.author?.email ?? "Unknown"} &middot;{" "}
        {fmt(a.published_at)}
      </p>

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
          <form action={replyAction} className="mt-6 flex flex-col gap-3">
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Write a reply…"
              className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue"
            >
              Reply
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
