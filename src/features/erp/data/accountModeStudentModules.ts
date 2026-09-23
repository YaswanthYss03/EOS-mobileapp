import type { QuickAccessItem } from "../types";
import { studentSectionItems as hodStudentSectionItems } from "../hod/data/mockDashboard";
import { studentSectionItems as defaultEmployeeStudentSectionItems } from "../employee/data/mockDashboard";

// Switch Account / responsibility-based model - centralized Campus/Student
// module lists per active responsibility (see AuthContext.tsx's AccountMode,
// HodDashboard.tsx, EmployeeDashboard.tsx). A user can hold any subset of
// HOD/ADVISOR/SUBJECT_HANDLER (derived from real backend data, never from
// the JWT role alone) and switch between them without logging out.

// HOD responsibility - reuses the HoD dashboard's own Student section as-is.
export const HOD_STUDENT_MODULES: QuickAccessItem[] = hodStudentSectionItems;

// Class Advisor responsibility - the subset of the (unchanged) default
// Faculty/Employee tile set that's actually about advising a class, in the
// order the spec calls for. Filtered (not duplicated) from the same tile
// objects the default Employee dashboard already uses, so route/icon values
// never drift out of sync between the two.
const ADVISOR_ITEM_IDS = [
  "student-attendance",
  "student-leave",
  "student-od",
  "subject-records",
  "class-result",
  "announcements",
  "placements",
] as const;
export const ADVISOR_STUDENT_MODULES: QuickAccessItem[] = ADVISOR_ITEM_IDS.map(
  (id) => defaultEmployeeStudentSectionItems.find((item) => item.id === id)!,
);

// Subject Handling Faculty responsibility - reuses the same
// Attendance/Announcement/Subject Records tile objects as the Advisor list
// above, plus the subject-scoped tiles (Assignment Status/Online Class/
// Current Semester/CIA Marks/Timetable) that aren't part of any existing
// exported array to filter from - same route/icon values those tiles use
// everywhere else they appear (assignment-status and cia-marks are already
// reachable directly from Campus/Student today, this just adds one more
// place they're reachable from). Online Class/Current Semester route to
// this tab's OWN local copy of those screens (erp/online-class,
// erp/current-semester), not the Academics tab's - that tab is hidden
// entirely for Employee/HoD, and routing into a hidden tab left the Tabs
// navigator's back-stack corrupted (switching tabs afterward force-exited
// the app) - same reasoning as Timetable/CIA Marks/Assignment Status
// already having their own erp-local copy.
export const SUBJECT_HANDLER_STUDENT_MODULES: QuickAccessItem[] = [
  defaultEmployeeStudentSectionItems.find((item) => item.id === "student-attendance")!,
  { id: "assignment-status", label: "Assignment Status", icon: "checkmark-done-outline", route: "/(tabs)/erp/assignment-status" },
  { id: "online-class", label: "Online Class", icon: "videocam-outline", route: "/(tabs)/erp/online-class" },
  { id: "current-semester", label: "Current Semester", icon: "ribbon-outline", route: "/(tabs)/erp/current-semester" },
  defaultEmployeeStudentSectionItems.find((item) => item.id === "announcements")!,
  { id: "cia-marks", label: "CIA Marks", icon: "create-outline", route: "/(tabs)/erp/cia-marks" },
  defaultEmployeeStudentSectionItems.find((item) => item.id === "subject-records")!,
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/erp/timetable" },
];

// Fallback Campus/Student tile set for an Employee-mapped account with no
// detected responsibility at all (library/finance/academic_coordinator, or
// a Faculty account with no class_mentors/faculty_subject_class_mapping
// rows yet) - the same tile set this dashboard has always shown, untouched.
export const DEFAULT_EMPLOYEE_STUDENT_MODULES: QuickAccessItem[] = defaultEmployeeStudentSectionItems;
