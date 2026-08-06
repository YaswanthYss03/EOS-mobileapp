// Shared month-grid builder - used by any screen that renders a calendar
// (attendance history, date pickers, ...). Returns rows of 7 cells, null for
// the leading/trailing blanks outside the month.
export function getCalendarWeeks(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

// YYYY-MM-DD from the date's own local year/month/day - NOT date.toISOString()
// (which converts to UTC first and can shift the calendar day backwards for
// any timezone ahead of UTC, e.g. IST). Picker dates are always constructed
// as `new Date(year, month, day)` at local midnight, so reading the same
// local components back out is what actually reproduces the day the user
// tapped. Use this whenever a picked date needs to go to a backend endpoint
// expecting an ISO date string (from_date/to_date, etc).
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
