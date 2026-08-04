import type { QuickAccessItem } from "../../types";

export const quickAccessItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-check-outline", library: "material" },
  { id: "performance", label: "Performance", icon: "stats-chart-outline" },
  { id: "fees", label: "Fees", icon: "card-outline" },
];

export const campusItems: QuickAccessItem[] = [
  { id: "od", label: "OD", icon: "people-outline" },
  { id: "leave", label: "Leave", icon: "log-out-outline" },
  { id: "exam-schedule", label: "Exam schedule", icon: "calendar-outline" },
  { id: "bonafide", label: "Bonafide", icon: "document-text-outline" },
  { id: "hostel", label: "Hostel", icon: "bed-outline" },
  { id: "library", label: "Library", icon: "library-outline" },
  { id: "feedback", label: "Feedback", icon: "star-outline" },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline" },
];
