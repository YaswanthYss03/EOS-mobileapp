import type { QuickAccessItem } from "../../types";

// Shared with employee/data/mockDashboard.ts and hod/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";

// TODO: wire these up once the check-in/out and student-details screens
// exist - "Approve Leave" is now wired (see WardenLeaveRequestsScreen), the
// other two are still inert.
export const wardenSectionItems: QuickAccessItem[] = [
  { id: "check-in-out", label: "Check In / Check Out", icon: "swap-horizontal-outline" },
  { id: "approve-leave", label: "Approve Leave", icon: "checkmark-done-outline", route: "/(tabs)/erp/warden-leave-requests" },
  { id: "student-details", label: "Student Details", icon: "people-outline" },
];
