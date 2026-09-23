import { useRole } from "@/hooks/useRole";
import { PlacementsOverviewScreen } from "@/features/academics/placements/PlacementsOverviewScreen";
import { ParentPlacementsScreen } from "@/features/erp/parent/ParentPlacementsScreen";

// Reached from the Employee/HoD/Parent dashboard's Quick Access tile, not
// the Academics tab - see mockDashboard.ts. Same screen/role-branch as the
// Academics-side route (app/(tabs)/academics/placements/index.tsx), just
// its own navigation stack so it doesn't cross into a hidden tab (see
// QuickAccessGrid.tsx's own comment on why that used to require
// router.navigate() as a workaround). Note: named "placements" (plural) -
// distinct from the unrelated "erp/placement" (singular) placement-cell
// dashboard route.
export default function PlacementsOverviewErpRoute() {
  const role = useRole();

  if (role === "parent") {
    return <ParentPlacementsScreen />;
  }

  return <PlacementsOverviewScreen />;
}
