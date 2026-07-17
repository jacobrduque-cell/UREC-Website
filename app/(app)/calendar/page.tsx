import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  course_id: string | null;
};

// Plain helper, not a component — the current-time read here doesn't
// trip React's purity check for component/hook bodies.
function splitUpcomingPast(events: EventRow[]) {
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now);
  const past = events
    .filter((e) => new Date(e.starts_at).getTime() < now)
    .reverse();
  return { upcoming, past };
}

function fmt(iso: string, allDay: boolean) {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = allDay
    ? { weekday: "short", month: "short", day: "numeric" }
    : {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
  return d.toLocaleString("en-US", opts);
}

export default async function CalendarPage() {
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, starts_at, ends_at, all_day, course_id")
    .or(course ? `course_id.eq.${course.id},course_id.is.null` : "course_id.is.null")
    .order("starts_at", { ascending: true });

  const events = (data ?? []) as EventRow[];
  const { upcoming, past } = splitUpcomingPast(events);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-normal text-navy">
            Calendar
          </h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {isExec && (
          <Link
            href="/calendar/new"
            className="whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
          >
            New Event
          </Link>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Upcoming
        </h2>
        <ul className="mt-2 divide-y divide-hair border-t border-hair">
          {upcoming.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
          {upcoming.length === 0 && (
            <li className="py-4 text-sm text-muted">No upcoming events.</li>
          )}
        </ul>
      </div>

      {past.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Past
          </h2>
          <ul className="mt-2 divide-y divide-hair border-t border-hair opacity-60">
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: EventRow }) {
  return (
    <li className="py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-text">{event.title}</p>
        <span className="whitespace-nowrap text-xs text-muted">
          {fmt(event.starts_at, event.all_day)}
        </span>
      </div>
      {event.description && (
        <p className="mt-1 text-sm text-muted">{event.description}</p>
      )}
      {event.course_id === null && (
        <span className="mt-1.5 inline-block rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Platform-wide
        </span>
      )}
    </li>
  );
}
