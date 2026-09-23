import { AdvisorHigherEducationScreen } from "@/features/erp/employee/AdvisorHigherEducationScreen";

// Reached only from the Class Advisor's own Class-tab card grid (see
// AdvisorClassScreen.tsx) - shows which students in the Advisor's mentored
// class opted for higher education, not the generic student self-service
// opt-in form (HigherEducationScreen, unrelated, reached elsewhere via the
// Amenity tab for students themselves).
export default function HigherEducationErpRoute() {
  return <AdvisorHigherEducationScreen />;
}
