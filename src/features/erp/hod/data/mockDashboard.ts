import type { QuickAccessItem } from "../../types";

export const studentSectionItems: QuickAccessItem[] = [
  {
    id: "student-attendance",
    label: "Student Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/attendance",
  },
  { id: "student-leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/leave?tab=student" },
  { id: "student-od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/od?tab=student" },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline", route: "/(tabs)/erp/no-due" },
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
    route: "/(tabs)/erp/announcements",
  },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
  {
    id: "review-appraisal",
    label: "Review Appraisal",
    icon: "clipboard-outline",
    route: "/(tabs)/erp/review-appraisal",
  },
  { id: "pop-sop", label: "POP / SOP", icon: "document-text-outline", route: "/(tabs)/erp/pop-sop" },
  {
    id: "assign-faculty",
    label: "Assigned Faculty",
    icon: "person-add-outline",
    route: "/(tabs)/erp/assign-faculty",
  },
];

// Shared with employee/data/mockDashboard.ts and secretary/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";
