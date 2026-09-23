import { MedicalAppointmentCalendarScreen } from "@/features/erp/medical-appointment/MedicalAppointmentCalendarScreen";

// Reached from the Campus tab's own grid (see AmenityHomeScreen.tsx's
// studentOptions) for Student and Employee, not the erp tab's copy of this
// same route - a cross-tab push into the erp tab left its own back button
// (and its date-drill-down push, see [date].tsx) popping into the erp
// tab's Stack instead of back to Campus. HoD/Secretary/HR Payroll/Warden
// still reach the erp-tab version directly from their own Class-tab-style
// dashboard (see employeeSectionItems.ts), same-tab, unaffected.
export default function MedicalAppointmentAmenityRoute() {
  return <MedicalAppointmentCalendarScreen />;
}
