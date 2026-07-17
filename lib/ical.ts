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

function toDateStamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10).replace(/-/g, "");
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
        lines.push(`DTEND;VALUE=DATE:${toDateStamp(event.ends_at)}`);
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
