import { PlacementsOverviewScreen } from "@/features/academics/placements/PlacementsOverviewScreen";

// Reached from the Principal's Amenity page, not the Academics tab - see
// AmenityHomeScreen.tsx. Same screen/logic as the Academics-side route
// (PlacementsOverviewScreen already branches on role internally), just its
// own navigation stack so it doesn't connect into Academics.
export default function AmenityPlacementsRoute() {
  return <PlacementsOverviewScreen />;
}
