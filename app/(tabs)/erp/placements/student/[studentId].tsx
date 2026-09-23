import { StudentPlacementHistoryScreen } from "@/features/academics/placements/StudentPlacementHistoryScreen";

// Reached from the erp tab's own Placements copy (see
// app/(tabs)/erp/placements/index.tsx -> MentorPlacementsBody's
// openStudentHistory) - same screen as
// app/(tabs)/academics/placements/student/[studentId].tsx, just living in
// this tab's own stack so Employee/HoD never cross into the (hidden, for
// these roles) Academics tab.
export default function StudentPlacementHistoryErpRoute() {
  return <StudentPlacementHistoryScreen />;
}
