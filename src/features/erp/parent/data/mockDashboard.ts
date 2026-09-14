import type { QuickAccessItem } from "../../types";

// Parent dashboard is intentionally just these three, scoped to the
// parent's own linked child(ren) - see erp/parent-attendance,
// erp/parent-performance, erp/parent-fees. Same icons/labels as the
// Student dashboard's own quickAccessItems (erp/student/data/mockDashboard.ts),
// since it's the same three real concepts, just viewed by a parent instead
// of the student themselves.
export const quickAccessItems: QuickAccessItem[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/parent-attendance",
  },
  {
    id: "performance",
    label: "Performance",
    icon: "stats-chart-outline",
    route: "/(tabs)/erp/parent-performance",
  },
  { id: "fees", label: "Fees", icon: "card-outline", route: "/(tabs)/erp/parent-fees" },

  // Moved in from the old Class tab (see app/(tabs)/_layout.tsx - that tab
  // is now hidden for parent too, see isParent there). These reuse the
  // shared academics/* routes, which already render parent-specific
  // screens for this role (ParentTimetableScreen/ParentCalendarScreen/
  // ParentPlacementsScreen - see each route's own index.tsx role check),
  // not the generic student/faculty ones. Online Class deliberately left
  // out - the shared OnlineClassScreen has no parent-specific view and
  // calls the student-only GET /me/timetable, which 403s for a parent;
  // that tile was already broken in the old Class tab too, not something
  // this move should carry forward silently.
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/academics/timetable" },
  { id: "academic-calendar", label: "Academic Calendar", icon: "calendar-outline", route: "/(tabs)/academics/calendar" },
  { id: "placements", label: "Placements", icon: "briefcase-outline", route: "/(tabs)/academics/placements" },
];
