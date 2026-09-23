import { PlacementsOverviewScreen } from "@/features/academics/placements/PlacementsOverviewScreen";

// Reached from the Principal's own Services tab (erp tab, see
// PrincipalDashboard.tsx's academicsItems) - not the Amenity/Campus tab
// anymore (moved out of there, see AmenityHomeScreen.tsx's own comment) -
// this tab's own navigation stack so back-navigation stays inside Services
// instead of crossing into Campus's Stack. Same screen/logic as the other
// two route copies (PlacementsOverviewScreen already branches on role
// internally).
export default function PrincipalPlacementsRoute() {
  return <PlacementsOverviewScreen />;
}
