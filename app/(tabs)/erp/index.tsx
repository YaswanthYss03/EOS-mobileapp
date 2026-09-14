import { useRole, type Role } from "@/hooks/useRole";
import { StudentDashboard } from "@/features/erp/student/StudentDashboard";
import { EmployeeDashboard } from "@/features/erp/employee/EmployeeDashboard";
import { HodDashboard } from "@/features/erp/hod/HodDashboard";
import { AdminDashboard } from "@/features/erp/admin/AdminDashboard";
import { PrincipalDashboard } from "@/features/erp/principal/PrincipalDashboard";
import { ParentDashboard } from "@/features/erp/parent/ParentDashboard";
import { IqacDashboard } from "@/features/erp/iqac/IqacDashboard";
import { WardenDashboard } from "@/features/erp/warden/WardenDashboard";
import { CoeDashboard } from "@/features/erp/coe/CoeDashboard";
import { PlacementDashboard } from "@/features/erp/placement/PlacementDashboard";
import { BillingDashboard } from "@/features/erp/billing/BillingDashboard";
import { HrPayrollDashboard } from "@/features/erp/hr-payroll/HrPayrollDashboard";
import { MediaRoomDashboard } from "@/features/erp/media-room/MediaRoomDashboard";
import { SecretaryDashboard } from "@/features/erp/secretary/SecretaryDashboard";

// Renders the caller's own role dashboard directly, in place - deliberately
// NOT a <Redirect href={`/(tabs)/erp/${role}`}/> to a sibling route anymore.
// That redirect was the root cause of a long-running bug: it meant the
// focused route inside this tab's Stack was never literally "index" (it
// became e.g. "student"), so getFocusedRouteNameFromRoute-based bottom-tab-
// bar-visibility logic (see app/(tabs)/_layout.tsx's tabBarStyleForRoute,
// used identically by every other tab) could never treat this tab's own
// root as "root" without extra special-casing - which itself turned out
// fragile in practice (still reported as "bottom nav missing" after
// multiple fix attempts). Rendering directly here means the user is always
// structurally on this Stack's actual "index" screen while at the tab's
// root, exactly like Home/Class/Amenity/My Bus - no special-casing needed
// anywhere else.
const DASHBOARDS: Record<Role, () => React.JSX.Element> = {
  student: StudentDashboard,
  employee: EmployeeDashboard,
  hod: HodDashboard,
  admin: AdminDashboard,
  principal: PrincipalDashboard,
  parent: ParentDashboard,
  iqac: IqacDashboard,
  warden: WardenDashboard,
  coe: CoeDashboard,
  placement: PlacementDashboard,
  billing: BillingDashboard,
  "hr-payroll": HrPayrollDashboard,
  "media-room": MediaRoomDashboard,
  secretary: SecretaryDashboard,
};

export default function ErpIndex() {
  const role = useRole();
  const Dashboard = DASHBOARDS[role];
  return <Dashboard />;
}
