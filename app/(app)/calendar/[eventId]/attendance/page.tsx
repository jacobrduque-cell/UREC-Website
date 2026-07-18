import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { saveAttendance } from "./actions";

type EnrollmentRow = {
  section: { name: string } | null;
  user: { id: string; full_name: string | null; email: string } | null;
};

const STATUSES = ["present", "late", "excused", "absent"] as const;
const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!(await getIsExec())) redirect("/calendar");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("calendar_events")
    .select("id, title, starts_at, course_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) redirect("/calendar");
  if (!event.course_id) {
    // Platform-wide events have no single course roster to take.
    redirect("/calendar");
  }

  const [{ data: enrollData }, { data: recordData }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("section:course_sections(name), user:users(id, full_name, email)")
      .eq("course_id", event.course_id),
    supabase.from("attendance_records").select("user_id, status").eq("event_id", eventId),
  ]);

  const students = ((enrollData ?? []) as unknown as EnrollmentRow[])
    .filter((e) => e.user)
    .sort((a, b) =>
      (a.user!.full_name ?? a.user!.email).localeCompare(b.user!.full_name ?? b.user!.email),
    );
  const current = new Map(
    ((recordData ?? []) as { user_id: string; status: string }[]).map((r) => [r.user_id, r.status]),
  );

  const counts = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 } as Record<string, number>;
  for (const e of students) {
    const s = current.get(e.user!.id);
    if (s && s in counts) counts[s]++;
    else counts.unmarked++;
  }

  const save = saveAttendance.bind(null, eventId);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Link href="/calendar" className="text-xs text-blue hover:underline">
        &larr; Calendar
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy-deep">Attendance</h1>
      <p className="mt-1 text-sm text-muted">
        {event.title} &middot;{" "}
        {new Date(event.starts_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 font-medium text-pos">
          {counts.present} present
        </span>
        <span className="rounded-full bg-[#fff3e0] px-2.5 py-1 font-medium text-[#B4531A]">
          {counts.late} late
        </span>
        <span className="rounded-full bg-pale px-2.5 py-1 font-medium text-sky">
          {counts.excused} excused
        </span>
        <span className="rounded-full bg-[#fdecea] px-2.5 py-1 font-medium text-neg">
          {counts.absent} absent
        </span>
        <span className="rounded-full bg-hair px-2.5 py-1 font-medium text-muted">
          {counts.unmarked} unmarked
        </span>
      </div>

      <form action={save} className="mt-6">
        <ul className="divide-y divide-hair border-t border-hair">
          {students.map((e) => {
            const uid = e.user!.id;
            const val = current.get(uid) ?? "";
            return (
              <li key={uid} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">
                    {e.user!.full_name ?? e.user!.email}
                  </p>
                  {e.section?.name && (
                    <p className="truncate text-xs text-muted">{e.section.name}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 gap-1" role="radiogroup" aria-label="Status">
                  {STATUSES.map((s) => (
                    <label
                      key={s}
                      className="cursor-pointer rounded-md border border-hair px-2.5 py-1 text-xs text-muted transition-colors has-[:checked]:border-blue has-[:checked]:bg-pale has-[:checked]:font-medium has-[:checked]:text-sky"
                    >
                      <input
                        type="radio"
                        name={`status_${uid}`}
                        value={s}
                        defaultChecked={val === s}
                        className="sr-only"
                      />
                      {STATUS_LABEL[s]}
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
          {students.length === 0 && (
            <li className="py-6 text-sm text-muted">No one enrolled in this course yet.</li>
          )}
        </ul>

        {students.length > 0 && (
          <button
            type="submit"
            className="mt-6 rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Save attendance
          </button>
        )}
      </form>
    </div>
  );
}
