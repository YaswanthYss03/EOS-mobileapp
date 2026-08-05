import type { QuickAccessItem } from "../../types";

// HR & Payroll's own approval view over institution-wide staff requests -
// Faculty vs Others (non-teaching staff), not the HoD's per-department
// Student/Faculty view (see erp/faculty-leave/FacultyLeaveScreen.tsx and
// erp/faculty-od/FacultyOdScreen.tsx).
export const hrSectionItems: QuickAccessItem[] = [
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/faculty-leave" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/faculty-od" },
];

// Same self-service items every staff member gets, regardless of role - see
// erp/employee/data/mockDashboard.ts and erp/hod/data/mockDashboard.ts.
export const employeeSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline", route: "/(tabs)/erp/my-attendance" },
  { id: "leave-request", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/leave-request" },
  { id: "od-request", label: "OD", icon: "person-outline", route: "/(tabs)/erp/od-request" },
  { id: "venue", label: "Venue", icon: "location-outline", route: "/(tabs)/erp/venue-request" },
  { id: "hr-payroll", label: "HR Payroll", icon: "cash-outline", route: "/(tabs)/erp/hr-payroll-request" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline", route: "/(tabs)/erp/payslip-request" },
  { id: "appraisal", label: "Appraisal", icon: "ribbon-outline", route: "/(tabs)/erp/appraisal-request" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/library" },
];
