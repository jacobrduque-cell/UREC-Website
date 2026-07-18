import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import Link from "next/link";

type Hit = { href: string; title: string; kind: string; sub?: string };

// Course-scoped global search. Every query runs as the viewer's own
// client, so RLS filters results to what they're allowed to see (drafts
// hidden from students, other courses excluded, etc.) — no extra checks
// needed. Title/body ilike across the main content types.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q: rawQ }, course] = await Promise.all([searchParams, getCurrentCourse()]);
  const q = (rawQ ?? "").trim();
  // Strip characters that have meaning in the PostgREST filter grammar
  // (commas, parens) and LIKE wildcards, so an interpolated `.or()` string
  // can't be broken or turned into an unintended pattern.
  const safe = q.replace(/[%_,()\\*]/g, " ").trim();

  const supabase = await createClient();
  const hits: Hit[] = [];

  if (safe.length >= 2 && course) {
    const cid = course.id;
    const like = `%${safe}%`;

    // People must be scoped to THIS course's roster — the users table is
    // globally readable, so an unscoped search would surface members of
    // other cohorts and contradict the "in <course>" framing. Resolve the
    // course's enrolled user ids first (enrollments are roster-visible to
    // every member), then match names/emails within that set.
    const { data: enrolledRows } = await supabase
      .from("enrollments")
      .select("user_id")
      .eq("course_id", cid);
    const enrolledIds = [
      ...new Set(((enrolledRows ?? []) as { user_id: string }[]).map((r) => r.user_id)),
    ];

    const [ann, assign, pages, disc, files, people] = await Promise.all([
      supabase.from("announcements").select("id, title").eq("course_id", cid).or(`title.ilike.${like},body.ilike.${like}`).limit(6),
      supabase.from("assignments").select("id, title").eq("course_id", cid).or(`title.ilike.${like},description.ilike.${like}`).limit(6),
      supabase.from("wiki_pages").select("title, slug").eq("course_id", cid).or(`title.ilike.${like},body_markdown.ilike.${like}`).limit(6),
      supabase.from("discussion_topics").select("id, title").eq("course_id", cid).or(`title.ilike.${like},body.ilike.${like}`).limit(6),
      supabase.from("files").select("id, filename, folder_id").eq("course_id", cid).eq("published", true).ilike("filename", like).limit(6),
      enrolledIds.length > 0
        ? supabase.from("users").select("id, full_name, email").in("id", enrolledIds).or(`full_name.ilike.${like},email.ilike.${like}`).limit(6)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string }[] }),
    ]);

    const push = (rows: unknown[] | null, fn: (r: Record<string, unknown>) => Hit) =>
      (rows ?? []).forEach((r) => hits.push(fn(r as Record<string, unknown>)));

    push(ann.data, (r) => ({ href: `/announcements/${r.id}`, title: String(r.title), kind: "Announcement" }));
    push(assign.data, (r) => ({ href: `/assignments/${r.id}`, title: String(r.title), kind: "Assignment" }));
    push(pages.data, (r) => ({ href: `/pages/${r.slug}`, title: String(r.title), kind: "Page" }));
    push(disc.data, (r) => ({ href: `/discussions/${r.id}`, title: String(r.title), kind: "Discussion" }));
    push(files.data, (r) => ({
      // Land in the folder the file actually lives in, not the Files root.
      href: r.folder_id ? `/files/${r.folder_id}` : `/files`,
      title: String(r.filename),
      kind: "File",
    }));
    push(people.data, (r) => ({
      // Open the roster pre-filtered to this person.
      href: `/directory?q=${encodeURIComponent(String(r.full_name ?? r.email))}`,
      title: String(r.full_name ?? r.email),
      kind: "Person",
      sub: r.full_name ? String(r.email) : undefined,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-deep">Search</h1>
      <form action="/search" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search this course — announcements, assignments, pages, people…"
          className="w-full rounded-md border border-hair bg-white px-4 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
      </form>

      {safe.length >= 2 ? (
        <div className="mt-6">
          <p className="text-xs text-muted">
            {hits.length} result{hits.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
            {course ? ` in ${course.name}` : ""}
          </p>
          <ul className="mt-3 divide-y divide-hair border-t border-hair">
            {hits.map((h, i) => (
              <li key={i}>
                <Link href={h.href} className="flex items-center justify-between gap-4 py-3 hover:bg-[#eef7ff]">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-sky">{h.title}</span>
                    {h.sub && <span className="block truncate text-xs text-muted">{h.sub}</span>}
                  </span>
                  <span className="flex-shrink-0 rounded-full border border-hair px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {h.kind}
                  </span>
                </Link>
              </li>
            ))}
            {hits.length === 0 && <li className="py-6 text-sm text-muted">No matches.</li>}
          </ul>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">Type at least two characters to search.</p>
      )}
    </div>
  );
}
