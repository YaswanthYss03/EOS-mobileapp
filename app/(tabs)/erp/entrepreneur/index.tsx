import { AdvisorEntrepreneurScreen } from "@/features/erp/employee/AdvisorEntrepreneurScreen";

// Reached only from the Class Advisor's own Class-tab card grid (see
// AdvisorClassScreen.tsx) - shows which students in the Advisor's mentored
// class opted for entrepreneurship, not the generic student self-service
// opt-in form (EntrepreneurScreen, unrelated, reached elsewhere via the
// Amenity tab for students themselves).
export default function EntrepreneurErpRoute() {
  return <AdvisorEntrepreneurScreen />;
}
