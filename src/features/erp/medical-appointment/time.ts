// Display helpers for appointment times. The backend always speaks "HH:mm" in
// 24-hour form; every screen shows 12-hour with am/pm, which is what the
// printed OPD register and the rest of this app use.

/** "13:30" -> "1:30 pm". Returns the input unchanged if it is not HH:mm. */
export function formatHm12(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return time;
  const period = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

/** "10:00 am – 1:00 pm" */
export function formatTimeRange(start: string, end: string): string {
  return `${formatHm12(start)} – ${formatHm12(end)}`;
}

/** "Monday, 18 May 2026" from a YYYY-MM-DD string, read as a local date. */
export function formatFullDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
