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
  { id: "student-leave", label: "Student Leave", icon: "log-out-outline", route: "/(tabs)/erp/student-leave" },
  { id: "student-od", label: "Student OD", icon: "people-outline", route: "/(tabs)/erp/student-od" },
  {
    id: "assignment-status",
    label: "Assignment Status",
    icon: "checkmark-done-outline",
    route: "/(tabs)/erp/assignment-status",
  },
  {
    id: "subject-records",
    label: "Subject Records",
    icon: "book-outline",
    route: "/(tabs)/erp/subject-records",
  },
  { id: "cia-marks", label: "CIA Marks", icon: "create-outline", route: "/(tabs)/erp/cia-marks" },
  {
    id: "announcements",
    label: "Announcements",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/announcements?audience=faculty",
  },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
];
