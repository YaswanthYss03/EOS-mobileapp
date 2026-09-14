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

export const campusConfigs: CampusItemConfig[] = [
  {
    id: "exam-schedule",
    label: "Exam schedule",
    icon: "calendar-outline",
    route: "/(tabs)/erp/student-exam-schedule",
  },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline", route: "/(tabs)/erp/student-no-due" },
  { id: "leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/student-leave-apply" },
  { id: "od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/student-od-apply" },
  { id: "feedback", label: "Feedback", icon: "star-outline", route: "/(tabs)/erp/student-feedback" },
  { id: "library", label: "Library", icon: "library-outline", route: "/(tabs)/erp/student-library" },
  { id: "bonafide", label: "Bonafide", icon: "document-text-outline", route: "/(tabs)/erp/student-bonafide" },
  // Same medical appointment booking every staff role gets from the shared
  // Employee grid (see src/features/erp/data/employeeSectionItems.ts) - it sits
  // under Campus here because that is where a student's own services live.
  { id: "medical", label: "Medical", icon: "medkit-outline", route: "/(tabs)/erp/medical-appointment" },
  { id: "hostel", label: "Hostel", icon: "bed-outline", route: "/(tabs)/erp/student-hostel" },
];
