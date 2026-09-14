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
    label: "Announcement",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/announcements?audience=faculty",
  },
  { id: "class-result", label: "Class Result", icon: "bar-chart-outline", route: "/(tabs)/erp/class-result" },
  // Screen/backend already exist and are shared with students (see
  // src/features/academics/calendar/AcademicCalendarScreen.tsx - GET
  // /me/faculty-academic-calendar) - this dashboard just never linked to it.
  {
    id: "academic-calendar",
    label: "Academic Calendar",
    icon: "calendar-outline",
    route: "/(tabs)/academics/calendar",
  },

  // Moved in from the old Class tab (see app/(tabs)/_layout.tsx - that tab
  // is now hidden entirely for faculty/HoD too, see isFaculty there). Routes
  // are unchanged (same academics/* screens, just reached from here instead
  // of the Class tab's own chooser) - same icons those tiles used there, and
  // no `library`/`size` override so they render at the same size as every
  // other tile in this section (see QuickAccessGrid's default SIZES).
  {
    id: "current-semester",
    label: "Current Semester",
    icon: "ribbon-outline",
    route: "/(tabs)/academics/current-semester",
  },
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/academics/timetable" },
  { id: "online-class", label: "Online Class", icon: "videocam-outline", route: "/(tabs)/academics/online-class" },
  { id: "placements", label: "Placements", icon: "briefcase-outline", route: "/(tabs)/academics/placements" },
];
