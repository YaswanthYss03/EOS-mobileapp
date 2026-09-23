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

  // Leave / Hostel Leave / OD requests, all 3 in one page - see
  // ParentAcknowledgeScreen. Not "moved in" from anywhere else - this is a
  // new concept, the parent's own acknowledgement of their child's
  // requests, surfaced to the Advisor (Leave/OD) and Warden (Hostel Leave)
  // as a badge on their own review cards.
  { id: "acknowledge", label: "Acknowledge", icon: "checkmark-done-outline", route: "/(tabs)/erp/parent-acknowledge" },

  // Moved in from the old Class tab (see app/(tabs)/_layout.tsx - that tab
  // is now hidden for parent too, see isParent there). Routed through thin
  // same-tab wrappers under erp/ (see app/(tabs)/erp/
  // timetable|calendar|placements/index.tsx) rather than straight at their
  // academics/* originals - those live in the now-hidden Academics tab, and
  // reaching them cross-tab left this tile's own slide-in animation feeling
  // different from every other same-tab page (see QuickAccessGrid.tsx's
  // router.navigate() comment for the cross-tab back-stack bug that routing
  // choice was originally working around). Each erp/ wrapper replicates the
  // same role check the academics/* route had, so this role still gets its
  // own parent-specific screens (ParentTimetableScreen/ParentCalendarScreen/
  // ParentPlacementsScreen), not the generic student/faculty ones. Online
  // Class deliberately left out - the shared OnlineClassScreen has no
  // parent-specific view and calls the student-only GET /me/timetable,
  // which 403s for a parent; that tile was already broken in the old Class
  // tab too, not something this move should carry forward silently.
  { id: "timetable", label: "Timetable", icon: "time-outline", route: "/(tabs)/erp/timetable" },
  { id: "academic-calendar", label: "Academic Calendar", icon: "calendar-outline", route: "/(tabs)/erp/calendar" },
  { id: "placements", label: "Placements", icon: "briefcase-outline", route: "/(tabs)/erp/placements" },
];
