export type DayMark = "absent" | "onDuty" | "holiday";

// TODO: replace with a real call once an attendance backend endpoint exists.
export const attendanceSummary = {
  overallPercent: 85,
  eligibilityThresholdPercent: 75,
  semesterLabel: "Semester 5",
  hoursAttended: 187,
  totalHours: 219,
};

export const defaultViewMonth = { year: 2026, month: 6 }; // July (0-indexed)

// Keyed "year-month-day" (month is 0-indexed to match JS Date) - only July
// 2026 has real mock markings; Sundays default to "holiday", everything else
// defaults to "present" (no override needed).
export const mockDayMarks: Record<string, DayMark> = {
  "2026-6-3": "absent",
  "2026-6-9": "absent",
  "2026-6-14": "onDuty",
  "2026-6-21": "absent",
  "2026-6-27": "onDuty",
};
