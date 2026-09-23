import { FacultyAttendanceScreen } from "@/features/erp/faculty-attendance/FacultyAttendanceScreen";

// HOD's own local route copy (Faculty tab) - backend already scopes the
// roster to the caller's own department when role='hod' (see
// me-staff-attendance.service.ts), so no extra params needed here beyond
// the basePath that keeps drill-down navigation inside this tab's Stack.
export default function HodFacultyAttendanceRoute() {
  return <FacultyAttendanceScreen basePath="/(tabs)/academics/hod-faculty-attendance" />;
}
