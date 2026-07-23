import { createClient } from "@/lib/supabase/server";
import { getIsStaff } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { saveAttendance } from "./actions";
import { AttendanceForm } from "./attendance-form";
import { Breadcrumbs } from "../../../ui/breadcrumbs";

type EnrollmentRow = {
  section: { name: string } | null;
  user: { id: string; full_name: string | null; email: string } | null;
};

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!(await getIsStaff())) redirect("/calendar");

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
    )
    .map((e) => ({
      id: e.user!.id,
      name: e.user!.full_name ?? e.user!.email,
      sectionName: e.section?.name ?? null,
    }));
  const current = new Map(
    ((recordData ?? []) as { user_id: string; status: string }[]).map((r) => [r.user_id, r.status]),
  );

  const counts = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 } as Record<string, number>;
  for (const s of students) {
    const status = current.get(s.id);
    if (status && status in counts) counts[status]++;
    else counts.unmarked++;
  }

  const save = saveAttendance.bind(null, eventId);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Breadcrumbs
        items={[
          { label: "Calendar", href: "/calendar" },
          { label: "Attendance" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">Attendance</h1>
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

      <AttendanceForm
        action={save}
        students={students}
        current={Object.fromEntries(current)}
      />
    </div>
  );
}
