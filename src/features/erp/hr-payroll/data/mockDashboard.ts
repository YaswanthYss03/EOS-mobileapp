import type { QuickAccessItem } from "../../types";

// HR & Payroll's own approval view over institution-wide staff requests -
// Faculty vs Others (non-teaching staff), not the HoD's per-department
// Student/Faculty view (see erp/faculty-leave/FacultyLeaveScreen.tsx and
// erp/faculty-od/FacultyOdScreen.tsx).
export const hrSectionItems: QuickAccessItem[] = [
  { id: "leave", label: "Leave", icon: "airplane-outline", route: "/(tabs)/erp/faculty-leave" },
  { id: "od", label: "OD", icon: "person-outline", route: "/(tabs)/erp/faculty-od" },
];

// Same self-service items every staff member gets, regardless of role -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";
