import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { relativeTime } from "@/lib/relative-time";
import Link from "next/link";
import { createTopic } from "./actions";
import { NewTopicForm } from "./new-topic-form";

type TopicRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
  // PostgREST aggregate — a single count row, not every reply id.
  discussion_replies: { count: number }[];
};

export default async function DiscussionsPage() {
  const course = await getCurrentCourse();
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("discussion_topics")
        .select(
          "id, title, body, created_at, author:users(full_name, email), discussion_replies(count)",
        )
        .eq("course_id", course.id)
        .order("created_at", { ascending: false })
    : { data: null };

  const topics = (data ?? []) as unknown as TopicRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Discussions
      </h1>
      <p className="mt-2 text-sm text-muted">
        Anyone in the program can start a topic or reply.
      </p>

      {topics.length === 0 ? (
        <div className="mt-8 rounded-md border border-hair bg-white py-16 text-center">
          <div aria-hidden className="text-4xl opacity-70">💬</div>
          <p className="mt-3 text-base font-medium text-text">No discussions yet</p>
          <p className="mt-1 text-sm text-muted">
            Start the first topic below — ask a question or share something worth talking about.
          </p>
        </div>
      ) : (
      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {topics.map((t) => (
          <li key={t.id} className="py-3.5">
            <Link
              href={`/discussions/${t.id}`}
              className="text-sm font-medium text-sky hover:underline"
            >
              {t.title}
            </Link>
            <p className="mt-0.5 text-xs text-muted">
              {t.author?.full_name ?? t.author?.email ?? "Unknown"} &middot;{" "}
              {(t.discussion_replies[0]?.count ?? 0)} repl
              {(t.discussion_replies[0]?.count ?? 0) === 1 ? "y" : "ies"} &middot;{" "}
              {new Date(t.created_at).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric" })}
              <span className="text-muted/80"> &middot; {relativeTime(t.created_at)}</span>
            </p>
          </li>
        ))}
      </ul>
      )}

      <div className="mt-8 border-t border-hair pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Start a Topic
        </h2>
        <NewTopicForm action={createTopic} />
      </div>
    </div>
  );
}
