// UREC runs on one wall clock: America/Los_Angeles (Berkeley).
//
// A browser submits <input type="datetime-local"> as a bare wall-clock
// string with NO timezone (e.g. "2026-07-18T17:00"). The server runtime
// is UTC, so `new Date("2026-07-18T17:00")` reads the exec's intended
// 5:00 PM as 17:00 UTC — 7-8 hours early. Every stored deadline then
// renders (via toLocaleString({ timeZone })) 7-8 hours before what was
// typed, and the availability-window / Late-flag checks fire at the
// wrong instant. These helpers pin naive form times to Pacific, and
// render stored UTC instants back to a Pacific wall-clock string for
// edit-form prefills. Pure (no server-only imports) so form components
// on either side of the client boundary can use them.

export const CLUB_TIME_ZONE = "America/Los_Angeles";

// Milliseconds to add to a UTC instant to reach the club zone's wall
// clock (negative for Pacific). Derived from the instant itself, so DST
// (PST vs PDT) is handled without a date library.
function zoneOffsetMs(instant: Date): number {
  const utc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  const local = new Date(instant.toLocaleString("en-US", { timeZone: CLUB_TIME_ZONE }));
  return local.getTime() - utc.getTime();
}

/**
 * A naive "YYYY-MM-DDTHH:mm" wall-clock value from a datetime-local
 * input, interpreted as Pacific, converted to a UTC ISO string for
 * storage. Returns null for empty input.
 */
export function pacificWallClockToUtcISO(naive: string | null | undefined): string | null {
  const value = (naive ?? "").trim();
  if (!value) return null;
  // Read the wall-clock digits as if they were UTC, then correct by the
  // Pacific offset in effect at that moment.
  const asUtc = new Date(`${value}Z`);
  if (Number.isNaN(asUtc.getTime())) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  const offset = zoneOffsetMs(asUtc);
  return new Date(asUtc.getTime() - offset).toISOString();
}

/**
 * A stored UTC ISO instant rendered as a "YYYY-MM-DDTHH:mm" Pacific
 * wall-clock string, for pre-filling a datetime-local input so the edit
 * form shows the same time the exec originally entered.
 */
export function utcISOToPacificWallClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // some ICU builds render midnight as 24
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
