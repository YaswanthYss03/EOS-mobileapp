import type { QuickAccessItem } from "../../types";

// Shared with employee/data/mockDashboard.ts and hod/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";

// TODO: wire these up once the check-in/out, leave-approval and student-details
// screens exist - same "still inert" pattern as other not-yet-built items.
export const wardenSectionItems: QuickAccessItem[] = [
  { id: "check-in-out", label: "Check In / Check Out", icon: "swap-horizontal-outline" },
  { id: "approve-leave", label: "Approve Leave", icon: "checkmark-done-outline" },
  { id: "student-details", label: "Student Details", icon: "people-outline" },
];
