import { MyAttendanceScreen } from "@/features/erp/my-attendance/MyAttendanceScreen";

// Reached from the Employee/Faculty Progress tab's own grid (see
// FacultyProgressScreen.tsx), not the Class tab - this tab's own local
// route copy so router.back() correctly pops back to Progress instead of
// crossing into the erp tab's Stack (see FacultyProgressScreen.tsx's own
// comment for why that cross-tab jump broke back navigation).
export default function MyAttendanceAcademicsRoute() {
  return <MyAttendanceScreen />;
}
