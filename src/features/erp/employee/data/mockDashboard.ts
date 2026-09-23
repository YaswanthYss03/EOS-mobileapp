import type { QuickAccessItem } from "../../types";

// Shared with hod/data/mockDashboard.ts and secretary/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";

// Faculty Account mode's Campus/Student section - deliberately just these 9
// tiles (see the Switch Account feature, AuthContext.tsx's AccountMode /
// HodDashboard.tsx). This is every Faculty account's own Student-section
// tile set (also reused as-is, via
// src/features/erp/data/accountModeStudentModules.ts, by a dual-role
// HOD+Faculty account when it switches into Faculty Account mode).
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
    id: "subject-records",
    label: "Subject Records",
    icon: "book-outline",
    route: "/(tabs)/erp/subject-records",
  },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/erp/timetable" },
  {
    id: "announcements",
    label: "Announcement",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/announcements?audience=faculty",
  },
  { id: "placements", label: "Placement", icon: "briefcase-outline", route: "/(tabs)/erp/placements" },
  // Screen/backend already exist and are shared with students (see
  // src/features/academics/calendar/AcademicCalendarScreen.tsx - GET
  // /me/faculty-academic-calendar) - this dashboard just never linked to it.
  {
    id: "academic-calendar",
    label: "Academic Calendar",
    icon: "calendar-outline",
    route: "/(tabs)/erp/calendar",
  },
];

// The Class tab's own fixed grid - replaces the activeAccountMode-based
// Student/Employee section split above for this dashboard's actual render
// (see EmployeeDashboard.tsx). Deliberately this exact set and nothing else
// - every other Employee-section tile (Leave/OD/Payslip/Appraisal/...) now
// lives on the Progress tab instead (see progressSectionItems.ts). "LMS" and
// "Exam Marks" are just this tile's own label - the underlying screens
// (CurrentSemesterScreen/CiaMarksScreen) are unrenamed since CIA Marks'
// screen is faculty-only but "Current Semester" is shared with the student
// Academics flow.
export const classTabItems: QuickAccessItem[] = [
  {
    id: "student-attendance",
    label: "Student Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/attendance",
  },
  { id: "online-class", label: "Online Class", icon: "videocam-outline", route: "/(tabs)/erp/online-class" },
  {
    id: "announcements",
    label: "Announcement",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/announcements?audience=faculty",
  },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/erp/timetable" },
  { id: "calendar", label: "Calendar", icon: "calendar-outline", route: "/(tabs)/erp/calendar" },
  { id: "lms", label: "LMS", icon: "ribbon-outline", route: "/(tabs)/erp/current-semester" },
  { id: "exam-marks", label: "Exam Marks", icon: "create-outline", route: "/(tabs)/erp/cia-marks" },
  { id: "subject-records", label: "Subject Records", icon: "book-outline", route: "/(tabs)/erp/subject-records" },
  { id: "venue-booking", label: "Venue Booking", icon: "location-outline", route: "/(tabs)/erp/venue-request" },
];
