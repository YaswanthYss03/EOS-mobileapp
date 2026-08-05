import type { QuickAccessItem } from "../types";

// Shared across every ERP role dashboard's "Employee" section (employee,
// hod, secretary, ...) - it's the same personal HR self-service grid
// regardless of role, so it lives here once instead of being duplicated
// per-dashboard.
export const employeeSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline", route: "/(tabs)/erp/my-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/leave-request" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/od-request" },
  { id: "venue", label: "Venue", icon: "location-outline", route: "/(tabs)/erp/venue-request" },
  { id: "hr-payroll", label: "HR Payroll", icon: "cash-outline", route: "/(tabs)/erp/hr-payroll-request" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline", route: "/(tabs)/erp/payslip-request" },
  { id: "appraisal", label: "Appraisal", icon: "ribbon-outline", route: "/(tabs)/erp/appraisal-request" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/library" },
];
