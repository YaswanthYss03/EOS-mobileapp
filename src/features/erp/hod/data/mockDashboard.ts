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
    label: "Announcement",
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
  // Screen/backend already exist and are shared with students/faculty (see
  // src/features/academics/calendar/AcademicCalendarScreen.tsx - GET
  // /me/faculty-academic-calendar) - this dashboard just never linked to it.
  {
    id: "academic-calendar",
    label: "Academic Calendar",
    icon: "calendar-outline",
    route: "/(tabs)/academics/calendar",
  },

  // Moved in from the old Class tab (see app/(tabs)/_layout.tsx - that tab
  // is now hidden entirely for HoD too, see isHod there). Routes are
  // unchanged (same academics/* screens, just reached from here instead of
  // the Class tab's own chooser) - same icons those tiles used there, and no
  // `library`/`size` override so they render at the same size as every
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

// Shared with employee/data/mockDashboard.ts and secretary/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";
