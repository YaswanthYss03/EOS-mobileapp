export type EventCategory = "review" | "exam" | "holiday" | "event";

export type CalendarEvent = {
  id: string;
  day: number;
  month: number; // 0-indexed, matches Date - 7 is August
  year: number;
  title: string;
  weekday: string;
  category: EventCategory;
  label: string;
};

export const categoryStyle: Record<EventCategory, { bg: string; text: string }> = {
  review: { bg: "#EAF0FD", text: "#2F6FE0" },
  exam: { bg: "#FEF3E2", text: "#C2790C" },
  holiday: { bg: "#E7F7EF", text: "#1E8A5A" },
  event: { bg: "#EAF0FD", text: "#2F6FE0" },
};

// TODO: view-only - replace mockEvents with a real call once the academics backend endpoint exists
export const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    day: 5,
    month: 7,
    year: 2026,
    title: "Mini project review 1",
    weekday: "Wednesday",
    category: "review",
    label: "Review",
  },
  {
    id: "2",
    day: 11,
    month: 7,
    year: 2026,
    title: "CIA-2 examinations begin",
    weekday: "Tuesday",
    category: "exam",
    label: "Exam",
  },
  {
    id: "3",
    day: 15,
    month: 7,
    year: 2026,
    title: "Independence Day",
    weekday: "Saturday",
    category: "holiday",
    label: "Holiday",
  },
  {
    id: "4",
    day: 22,
    month: 7,
    year: 2026,
    title: "Placement drive · Deloitte",
    weekday: "Saturday",
    category: "event",
    label: "Drive",
  },
  {
    id: "5",
    day: 3,
    month: 8,
    year: 2026,
    title: "Semester fee due",
    weekday: "Thursday",
    category: "event",
    label: "Deadline",
  },
  {
    id: "6",
    day: 30,
    month: 6,
    year: 2026,
    title: "Mini project review 0",
    weekday: "Thursday",
    category: "review",
    label: "Review",
  },
];
