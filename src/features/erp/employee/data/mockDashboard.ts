import type { QuickAccessItem } from "../../types";

// Shared with hod/data/mockDashboard.ts and secretary/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";

export const studentSectionItems: QuickAccessItem[] = [
  {
    id: "student-attendance",
    label: "Student Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/attendance",
  },
  { id: "student-leave", label: "Student Leave", icon: "log-out-outline" },
  { id: "student-od", label: "Student OD", icon: "people-outline" },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline" },
  {
    id: "subject-records",
    label: "Subject Records",
    icon: "book-outline",
    route: "/(tabs)/erp/subject-records",
  },
  { id: "cia-marks", label: "CIA Marks", icon: "create-outline", route: "/(tabs)/erp/cia-marks" },
  { id: "announcements", label: "Announcements", icon: "megaphone-outline" },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
];
