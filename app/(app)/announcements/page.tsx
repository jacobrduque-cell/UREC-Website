import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  locked: boolean;
  published_at: string | null;
  author: { full_name: string | null; email: string } | null;
};

function excerpt(body: string, max = 140) {
  const plain = body.replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export default async function AnnouncementsPage() {
  const [course, isExec] = await Promise.all([
    getCurrentCourse(),
    getIsExec(),
  ]);

  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("announcements")
        .select(
          "id, title, body, pinned, locked, published_at, author:users(full_name, email)",
        )
        .eq("course_id", course.id)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
    : { data: null };

  const announcements = (data ?? []) as unknown as AnnouncementRow[];

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-normal text-navy">
            Announcements
          </h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {isExec && (
          <Link
            href="/announcements/new"
            className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
          >
            Post Announcement
          </Link>
        )}
      </div>

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {announcements.map((a) => {
          const isDraft = !a.published_at;
          const isScheduled = a.published_at && new Date(a.published_at) > new Date();
          return (
          <li key={a.id}>
            <Link
              href={`/announcements/${a.id}`}
              className="block py-4 transition-colors hover:bg-hair/40"
            >
              <div className="flex items-center gap-2">
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
                {isExec && isDraft && (
                  <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Draft
                  </span>
                )}
                {isExec && isScheduled && (
                  <span className="rounded-full border border-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue">
                    Scheduled
                  </span>
                )}
                <p className="font-medium text-text">{a.title}</p>
              </div>
              <p className="mt-1 text-sm text-muted">{excerpt(a.body)}</p>
              <p className="mt-1.5 text-xs text-muted">
                {a.author?.full_name ?? a.author?.email ?? "Unknown"}
                {a.published_at &&
                  ` · ${new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            </Link>
          </li>
          );
        })}
        {announcements.length === 0 && (
          <li className="py-6 text-sm text-muted">
            No announcements yet.
          </li>
        )}
      </ul>
    </div>
  );
}
