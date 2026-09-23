import type { QuickAccessItem } from "../../types";

// HR & Payroll's own "Services" tab (see app/(tabs)/_layout.tsx's
// isHrPayroll - a full bottom-nav tab now, not a section within a shared
// Class-tab dashboard) - HR's own approval view over institution-wide staff
// requests (Faculty vs Others/non-teaching staff, not the HoD's
// per-department Student/Faculty view - see
// erp/faculty-leave/FacultyLeaveScreen.tsx and erp/faculty-od/
// FacultyOdScreen.tsx), plus Payslip (reviewing/approving payslip requests
// is HR's own domain, not a personal self-service item for this role),
// Timetable (of every faculty member - see erp/timetable/index.tsx's own
// role branch to FacultyTimetableRosterScreen), and Venue (booking -
// moved in from the old shared Employee section, HR's own domain too).
//
// No "HR Payroll" tile here (unlike every other role) - that tile opens
// HrPayrollRequestScreen, which is the "raise a help-desk ticket to HR"
// self-service form (see its own doc comment: "Reachable from the
// Employee/HoD/HR dashboards' 'HR Payroll' item"). HR staff filing a
// ticket to HR, addressed to themselves, made no sense, so it's left out
// entirely for this role rather than moved. Appraisal moved in from this
// role's own Progress tab (see hrProgressItems below) per explicit
// request - routed through the already-existing erp-tab-local wrapper copy
// (app/(tabs)/erp/appraisal-request, previously unused by this role) so
// back navigation stays inside this tab's own Stack; AppraisalRequestScreen
// itself only ever does a plain router.back(), so this move needed no
// change to that screen.
export const hrSectionItems: QuickAccessItem[] = [
  { id: "attendance", label: "Faculty Attendance", icon: "calendar-outline", route: "/(tabs)/erp/faculty-attendance" },
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/faculty-leave" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/faculty-od" },
  { id: "payslip", label: "Payslip", icon: "receipt-outline", route: "/(tabs)/erp/faculty-payslip" },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/erp/timetable" },
  { id: "venue", label: "Venue", icon: "location-outline", route: "/(tabs)/erp/venue-request" },
  { id: "appraisal", label: "Appraisal", icon: "ribbon-outline", route: "/(tabs)/erp/appraisal-request" },
];

// HR & Payroll's own "Progress" tab (the academics tab, relabeled - see
// app/(tabs)/_layout.tsx) - just this role's own personal Attendance now
// (Appraisal moved to the Services tab above, per explicit request).
// Routed through this tab's own academics-local wrapper copy (already
// built for FacultyProgressScreen - see app/(tabs)/academics/my-attendance)
// rather than the erp tab's, for the same cross-tab back-stack reason as
// every other *-local route copy in this app.
export const hrProgressItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline", route: "/(tabs)/academics/my-attendance" },
];
