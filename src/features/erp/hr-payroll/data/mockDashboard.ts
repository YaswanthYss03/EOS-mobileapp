import type { QuickAccessItem } from "../../types";
import { employeeSectionItems as sharedEmployeeSectionItems } from "../../data/employeeSectionItems";

// HR & Payroll's own approval view over institution-wide staff requests -
// Faculty vs Others (non-teaching staff), not the HoD's per-department
// Student/Faculty view (see erp/faculty-leave/FacultyLeaveScreen.tsx and
// erp/faculty-od/FacultyOdScreen.tsx). Payslip moved here from the Employee
// section below, since reviewing/approving payslip requests is HR's own
// domain, not a personal self-service item for this role.
//
// No "HR Payroll" tile here (unlike every other role) - that tile opens
// HrPayrollRequestScreen, which is the "raise a help-desk ticket to HR"
// self-service form (see its own doc comment: "Reachable from the
// Employee/HoD/HR dashboards' 'HR Payroll' item"). HR staff filing a
// ticket to HR, addressed to themselves, made no sense, so it's left out
// entirely for this role rather than moved.
export const hrSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Faculty Attendance", icon: "calendar-outline", route: "/(tabs)/erp/faculty-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/faculty-leave" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/faculty-od" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline", route: "/(tabs)/erp/faculty-payslip" },
  // Moved in from the old Class tab (see app/(tabs)/_layout.tsx - that tab
  // is now hidden for HR Payroll too, see isHrPayroll there). HR Payroll's
  // Academics chooser only ever showed Timetable + Calendar to begin with
  // (no Current Semester/Online Class/Placements - see
  // AcademicsOverviewScreen.tsx's timetableAndCalendarOnly filter and
  // AcademicsChooserScreen.tsx's hrOptions, which drop everything else for
  // this role), so those are the only two tiles that make sense to carry
  // over. Same route/icon those tiles used, no `library`/`size` override so
  // they render at the same size as every other tile in this section.
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/academics/timetable" },
  { id: "academic-calendar", label: "Academic Calendar", icon: "calendar-outline", route: "/(tabs)/academics/calendar" },
];

// Same self-service grid every staff member gets (see
// src/features/erp/data/employeeSectionItems.ts), minus Leave/OD (HR
// already reviews institution-wide leave/OD requests via its own "HR"
// section above), minus Payslip (moved into the "HR" section above
// instead), and minus HR Payroll (dropped entirely, see hrSectionItems'
// own comment above). Other roles (HoD, Secretary, Employee) keep the full
// shared list untouched.
const HIDDEN_FOR_HR = new Set(["leave", "od", "hr-payroll", "payslip"]);

export const employeeSectionItems: QuickAccessItem[] = sharedEmployeeSectionItems.filter(
  (item) => !HIDDEN_FOR_HR.has(item.id),
);
