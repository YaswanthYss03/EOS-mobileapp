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
];
