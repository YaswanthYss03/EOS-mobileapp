import { useRole } from "@/hooks/useRole";
import { PlacementsOverviewScreen } from "@/features/academics/placements/PlacementsOverviewScreen";
import { ParentPlacementsScreen } from "@/features/erp/parent/ParentPlacementsScreen";

// Parent has no "own" placement application (they're not a candidate) -
// they see their linked child's real upcoming drives/history instead, via
// ParentPlacementsScreen. Every other role (student/faculty/hod) keeps the
// existing shared PlacementsOverviewScreen, unchanged.
export default function PlacementsOverviewRoute() {
  const role = useRole();

  if (role === "parent") {
    return <ParentPlacementsScreen />;
  }

  return <PlacementsOverviewScreen />;
}
