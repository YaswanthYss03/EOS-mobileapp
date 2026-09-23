import { useRole } from "@/hooks/useRole";
import { TimetableScreen } from "@/features/academics/timetable/TimetableScreen";
import { FacultyTimetableRosterScreen } from "@/features/erp/faculty-timetable/FacultyTimetableRosterScreen";
import { ParentTimetableScreen } from "@/features/erp/parent/ParentTimetableScreen";

// Reached from the Employee/HoD/HR-Payroll/Parent dashboard's Quick Access
// tile, not the Academics tab - see mockDashboard.ts. Same
// screen/role-branch as the Academics-side route
// (app/(tabs)/academics/timetable/index.tsx), just its own navigation stack
// so it doesn't cross into a hidden tab (see QuickAccessGrid.tsx's own
// comment on why that used to require router.navigate() as a workaround).
export default function TimetableErpRoute() {
  const role = useRole();

  if (role === "hr-payroll") {
    return <FacultyTimetableRosterScreen />;
  }

  if (role === "parent") {
    return <ParentTimetableScreen />;
  }

  return <TimetableScreen />;
}
