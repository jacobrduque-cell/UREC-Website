import "server-only";

type IcalEvent = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};

// RFC 5545 TEXT escaping — backslash, comma, semicolon, then newlines.
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// The Pacific calendar date (YYYY-MM-DD) of an instant. Events are stored
// as Pacific wall-clock converted to UTC, so an all-day event's DATE must
// reflect the Pacific day — formatting the raw UTC instant rolls any
// evening-Pacific event onto the next day for calendar subscribers.
function pacificDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso)); // en-CA → "YYYY-MM-DD"
}

function toDateStamp(iso: string): string {
  return pacificDate(iso).replace(/-/g, "");
}

// RFC 5545 all-day DTEND is EXCLUSIVE — the day after the last day —
// otherwise multi-day all-day events drop their final day. Add one
// calendar day to the Pacific end date. (Date.UTC at midnight is safe
// from DST since we only do integer day arithmetic on the date parts.)
function toDateStampExclusive(iso: string): string {
  const [y, m, d] = pacificDate(iso).split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(next.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function buildIcs(calendarName: string, events: IcalEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UREC Platform//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  const dtstamp = toUtcStamp(new Date().toISOString());
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@urec-platform`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (event.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${toDateStamp(event.starts_at)}`);
      if (event.ends_at) {
        lines.push(`DTEND;VALUE=DATE:${toDateStampExclusive(event.ends_at)}`);
      }
    } else {
      lines.push(`DTSTART:${toUtcStamp(event.starts_at)}`);
      if (event.ends_at) {
        lines.push(`DTEND:${toUtcStamp(event.ends_at)}`);
      }
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
