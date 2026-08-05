import type { QuickAccessItem } from "../../types";

// Shared with employee/data/mockDashboard.ts and hod/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";

export const secretarySectionItems: QuickAccessItem[] = [
  {
    id: "bulk-attendance",
    label: "Bulk Attendance",
    icon: "layers-outline",
    route: "/(tabs)/erp/bulk-attendance",
  },
  { id: "request-pop", label: "Request POP", icon: "cart-outline", route: "/(tabs)/erp/request-pop" },
  { id: "request-sop", label: "Request SOP", icon: "construct-outline", route: "/(tabs)/erp/request-sop" },
  { id: "request-media", label: "Request Media", icon: "videocam-outline", route: "/(tabs)/erp/request-media" },
];
