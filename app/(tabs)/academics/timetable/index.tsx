import { useRole } from "@/hooks/useRole";
import { TimetableScreen } from "@/features/academics/timetable/TimetableScreen";
import { FacultyTimetableRosterScreen } from "@/features/erp/faculty-timetable/FacultyTimetableRosterScreen";

// HR Payroll has no "own" teaching timetable (they don't teach), so this
// role gets the department/faculty roster browser instead of the
// self-scoped TimetableScreen every other role (student/faculty/hod) uses -
// see FacultyTimetableRosterScreen's own comment for why it's a distinct
// feature rather than a branch inside TimetableScreen itself.
export default function TimetableRoute() {
  const role = useRole();

  if (role === "hr-payroll") {
    return <FacultyTimetableRosterScreen />;
  }

  return <TimetableScreen />;
}
