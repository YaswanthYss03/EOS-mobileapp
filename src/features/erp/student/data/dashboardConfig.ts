import type { StatCardConfig, CampusItemConfig } from "../types";

// Icon/label/route only - no numbers here. See useStudentDashboardData for
// where the real value/subtitle/progress each of these gets merged with
// comes from.
export const statCardConfigs: StatCardConfig[] = [
  {
    id: "attendance",
    label: "Attendance",
    icon: "calendar-check-outline",
    library: "material",
    route: "/(tabs)/erp/student-attendance",
  },
  { id: "performance", label: "Performance", icon: "stats-chart-outline", route: "/(tabs)/erp/student-performance" },
  { id: "fees", label: "Fees", icon: "card-outline", route: "/(tabs)/erp/student-fees" },
];

// "Requests" section on the student's Progress tab (see StudentDashboard.tsx)
// - just Leave/OD/Bonafide now. No-Due and Exam Schedule moved to the
// Academics tab's Current Semester page (AcademicsOverviewScreen.tsx).
// Hostel moved to its own 5th bottom-nav tab for a hosteller (see
// app/(tabs)/bus-tracking/index.tsx). Library/Medical/Feedback moved to the
// Campus (amenity) tab (see AmenityHomeScreen.tsx). Same routes/screens in
// every case, just reachable from a different place now, never duplicated.
export const campusConfigs: CampusItemConfig[] = [
  { id: "leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/student-leave-apply" },
  { id: "od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/student-od-apply" },
  { id: "bonafide", label: "Bonafide", icon: "document-text-outline", route: "/(tabs)/erp/student-bonafide" },
];
