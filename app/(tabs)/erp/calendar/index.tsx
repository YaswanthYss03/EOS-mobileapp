import { useRole } from "@/hooks/useRole";
import { AcademicCalendarScreen } from "@/features/academics/calendar/AcademicCalendarScreen";
import { ParentCalendarScreen } from "@/features/erp/parent/ParentCalendarScreen";

// Reached from the Employee/HoD/HR-Payroll/Parent dashboard's Quick Access
// tile, not the Academics tab - see mockDashboard.ts. Same
// screen/role-branch as the Academics-side route
// (app/(tabs)/academics/calendar/index.tsx), just its own navigation stack
// so it doesn't cross into a hidden tab (see QuickAccessGrid.tsx's own
// comment on why that used to require router.navigate() as a workaround).
export default function AcademicCalendarErpRoute() {
  const role = useRole();

  if (role === "parent") {
    return <ParentCalendarScreen />;
  }

  return <AcademicCalendarScreen />;
}
