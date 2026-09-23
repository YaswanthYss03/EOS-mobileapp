import type { QuickAccessItem } from "../../types";

// HOD Account mode's Campus/Student section - deliberately just these 8
// tiles (see the Switch Account / responsibility-based model, AuthContext.tsx's
// AccountMode / HodDashboard.tsx). This is every HoD's own "HOD" responsibility
// tile set - a HoD who is also a class advisor and/or personally teaches a
// subject can additionally switch to ADVISOR_STUDENT_MODULES /
// SUBJECT_HANDLER_STUDENT_MODULES (see
// src/features/erp/data/accountModeStudentModules.ts).
export const studentSectionItems: QuickAccessItem[] = [
  { id: "student-leave", label: "Leave", icon: "log-out-outline", route: "/(tabs)/erp/leave?tab=student" },
  { id: "student-od", label: "OD", icon: "people-outline", route: "/(tabs)/erp/od?tab=student" },
  { id: "no-due", label: "No-Due", icon: "shield-checkmark-outline", route: "/(tabs)/erp/no-due" },
  { id: "pop-sop", label: "POP / SOP", icon: "document-text-outline", route: "/(tabs)/erp/pop-sop" },
  {
    id: "assign-faculty",
    label: "Assigned Faculty",
    icon: "person-add-outline",
    route: "/(tabs)/erp/assign-faculty",
  },
  {
    id: "announcements",
    label: "Announcement",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/announcements",
  },
  {
    id: "subject-records",
    label: "Subject Records",
    icon: "book-outline",
    route: "/(tabs)/erp/subject-records",
  },
  {
    id: "review-appraisal",
    label: "Review Appraisal",
    icon: "clipboard-outline",
    route: "/(tabs)/erp/review-appraisal",
  },
];

// Shared with employee/data/mockDashboard.ts and secretary/data/mockDashboard.ts -
// see src/features/erp/data/employeeSectionItems.ts.
export { employeeSectionItems } from "../../data/employeeSectionItems";
