import { EntrepreneurScreen } from "@/features/amenity/entrepreneur/EntrepreneurScreen";

// Reached from the Principal's own Services tab (erp tab, see
// PrincipalDashboard.tsx's academicsItems) - moved out of the Amenity/
// Campus tab (see AmenityHomeScreen.tsx's own comment) - this tab's own
// navigation stack so back-navigation stays inside Services.
export default function PrincipalEntrepreneurRoute() {
  return <EntrepreneurScreen />;
}
