import { MedicalAppointmentCalendarScreen } from "@/features/erp/medical-appointment/MedicalAppointmentCalendarScreen";

// Reached from the Employee/Faculty Progress tab's own grid (see
// FacultyProgressScreen.tsx) - see my-attendance/index.tsx's identical
// comment for why this needs its own Progress-tab-local route copy. Note:
// this screen's own "view slots for a date" drill-down still pushes to the
// erp tab's /(tabs)/erp/medical-appointment/[date] route internally (it has
// no basePath prop), so that one further step crosses back into the Class
// tab - a known, narrower gap than the top-level back button this route
// copy fixes.
export default function MedicalAppointmentAcademicsRoute() {
  return <MedicalAppointmentCalendarScreen />;
}
