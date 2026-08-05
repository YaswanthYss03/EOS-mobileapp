import type { QuickAccessItem } from "../../types";

export const quickAccessItems: QuickAccessItem[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/student-attendance",
  },
  {
    id: "performance",
    label: "Performance",
    icon: "stats-chart-outline",
    route: "/(tabs)/erp/student-performance",
  },
  { id: "fees", label: "Fees", icon: "card-outline", route: "/(tabs)/erp/student-fees" },
];

export const campusItems: QuickAccessItem[] = [
  { id: "od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/student-od-apply" },
  { id: "leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/student-leave-apply" },
  {
    id: "exam-schedule",
    label: "Exam schedule",
    icon: "calendar-outline",
    route: "/(tabs)/erp/student-exam-schedule",
  },
  { id: "bonafide", label: "Bonafide", icon: "document-text-outline", route: "/(tabs)/erp/student-bonafide" },
  { id: "hostel", label: "Hostel", icon: "bed-outline", route: "/(tabs)/erp/student-hostel" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/student-library" },
  { id: "feedback", label: "Feedback", icon: "star-outline", route: "/(tabs)/erp/student-feedback" },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline", route: "/(tabs)/erp/student-no-due" },
];
