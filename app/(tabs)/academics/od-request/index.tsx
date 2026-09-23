import { OdRequestScreen } from "@/features/erp/od-request/OdRequestScreen";

// Reached from the Employee/Faculty Progress tab's own grid (see
// FacultyProgressScreen.tsx) - see my-attendance/index.tsx's identical
// comment for why this needs its own Progress-tab-local route copy.
export default function OdRequestAcademicsRoute() {
  return <OdRequestScreen />;
}
