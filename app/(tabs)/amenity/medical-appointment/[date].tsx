import { MedicalAppointmentSlotsScreen } from "@/features/erp/medical-appointment/MedicalAppointmentSlotsScreen";

// This tab's own copy - see index.tsx's identical comment. Same screen,
// which only ever calls router.back() internally, so it correctly pops
// back to this route's own index within the Campus tab's Stack.
export default function MedicalAppointmentSlotsAmenityRoute() {
  return <MedicalAppointmentSlotsScreen />;
}
