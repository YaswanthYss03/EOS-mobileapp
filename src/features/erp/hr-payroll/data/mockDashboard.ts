import type { QuickAccessItem } from "../../types";
import { employeeSectionItems as sharedEmployeeSectionItems } from "../../data/employeeSectionItems";

// HR & Payroll's own approval view over institution-wide staff requests -
// Faculty vs Others (non-teaching staff), not the HoD's per-department
// Student/Faculty view (see erp/faculty-leave/FacultyLeaveScreen.tsx and
// erp/faculty-od/FacultyOdScreen.tsx). HR Payroll/Payslip moved here from
// the Employee section below, since they're HR's own domain, not a personal
// self-service item for this role.
export const hrSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Faculty Attendance", icon: "calendar-outline", route: "/(tabs)/erp/faculty-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/faculty-leave" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/faculty-od" },
  { id: "hr-payroll", label: "HR Payroll", icon: "cash-outline", route: "/(tabs)/erp/hr-payroll-request" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline", route: "/(tabs)/erp/faculty-payslip" },
];

// Same self-service grid every staff member gets (see
// src/features/erp/data/employeeSectionItems.ts), minus Leave/OD (HR
// already reviews institution-wide leave/OD requests via its own "HR"
// section above) and minus HR Payroll/Payslip (moved into the "HR" section
// above instead). Other roles (HoD, Secretary, Employee) keep the full
// shared list untouched.
const HIDDEN_FOR_HR = new Set(["leave", "od", "hr-payroll", "payslip"]);

export const employeeSectionItems: QuickAccessItem[] = sharedEmployeeSectionItems.filter(
  (item) => !HIDDEN_FOR_HR.has(item.id),
);
