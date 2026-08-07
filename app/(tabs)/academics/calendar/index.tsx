import { useRole } from "@/hooks/useRole";
import { AcademicCalendarScreen } from "@/features/academics/calendar/AcademicCalendarScreen";
import { ParentCalendarScreen } from "@/features/erp/parent/ParentCalendarScreen";

// Parent has no "own" academic calendar (a calendar is class-scoped, and a
// parent isn't enrolled in one) - they see their linked child's real
// calendar instead, via ParentCalendarScreen. Every other role
// (student/faculty/hod/hr-payroll) keeps the existing shared
// AcademicCalendarScreen, unchanged.
export default function AcademicCalendarRoute() {
  const role = useRole();

  if (role === "parent") {
    return <ParentCalendarScreen />;
  }

  return <AcademicCalendarScreen />;
}
