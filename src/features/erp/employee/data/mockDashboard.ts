import type { QuickAccessItem } from "../../types";

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

export const employeeSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline", route: "/(tabs)/erp/my-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/leave-request" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/od-request" },
  { id: "venue", label: "Venue", icon: "location-outline", route: "/(tabs)/erp/venue-request" },
  { id: "hr-payroll", label: "HR Payroll", icon: "cash-outline" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline" },
  { id: "appraisal", label: "Appraisal", icon: "ribbon-outline" },
  { id: "library", label: "Library", icon: "library-outline" },
];
