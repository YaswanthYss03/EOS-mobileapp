export type AttendanceDayStatus = "present" | "absent" | "onDuty" | "holiday";

// TODO: replace with a real call once an attendance backend endpoint exists.
export const attendanceStats = {
  present: 21,
  absent: 3,
  onDuty: 4,
  overallPercent: 89,
};

export const defaultViewMonth = { year: 2026, month: 6 }; // July (0-indexed)

// Keyed "year-month-day" (month is 0-indexed to match JS Date) - only July
// 2026 has real mock markings, other months default every day to "present".
export const mockAttendanceMarks: Record<string, AttendanceDayStatus> = {
  "2026-6-3": "absent",
  "2026-6-15": "absent",
  "2026-6-16": "absent",
  "2026-6-5": "holiday",
  "2026-6-12": "onDuty",
  "2026-6-20": "onDuty",
  "2026-6-21": "onDuty",
  "2026-6-22": "onDuty",
};
