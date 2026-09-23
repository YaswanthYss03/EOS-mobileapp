import { LeaveRequestScreen } from "@/features/erp/leave-request/LeaveRequestScreen";

// Reached from the Employee/Faculty Progress tab's own grid (see
// FacultyProgressScreen.tsx) - see my-attendance/index.tsx's identical
// comment for why this needs its own Progress-tab-local route copy.
export default function LeaveRequestAcademicsRoute() {
  return <LeaveRequestScreen />;
}
