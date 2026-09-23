import { useAuth } from "@/context/AuthContext";
import { useRole } from "./useRole";

// A handful of erp sub-screens (Announcements/No Due/Subject Records/
// POP-SOP/Review Appraisal/Assign Faculty/the Leave-Od ApprovalRequestsScreen)
// each toggle the shared Tabs-level header off on focus and explicitly back
// on on blur, via navigation.getParent().setOptions() - fine for a screen
// pushed one level deep from a tab root whose own header is the normal
// default (headerShown left true). But the Class Advisor's Class tab and a
// HOD's Student/Faculty tabs both keep that shared header STATICALLY off
// for their whole subtree instead (see app/(tabs)/_layout.tsx's
// isAdvisorOnly/isHodActingAsHod) - a screen pushed two levels deep there
// (tab root -> its own card/grid screen -> one of these) still runs this
// same blur cleanup, which resets headerShown back to true and leaks
// through to whichever screen the user navigates back to (which never
// touches headerShown itself), showing that screen's own inline header AND
// the shared CollegeHeader at once. Call this hook and skip the whole
// toggle (both directions) when it returns true - the static tab-level
// setting plus this screen's own already-inline header is enough on its
// own, no toggling needed.
export function useSkipSharedHeaderToggle(): boolean {
  const role = useRole();
  const { activeAccountMode } = useAuth();
  const isAdvisorOnly = role === "employee" && activeAccountMode === "ADVISOR";
  const isHodActingAsHod = role === "hod" && activeAccountMode !== "FACULTY";
  return isAdvisorOnly || isHodActingAsHod;
}
