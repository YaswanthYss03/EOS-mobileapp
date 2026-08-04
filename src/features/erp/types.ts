export type IconLibrary = "ionicons" | "material";

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: string;
  // Ionicons doesn't have every glyph we need (e.g. a calendar-with-checkmark
  // icon) - defaults to "ionicons", set to "material" to pull from
  // MaterialCommunityIcons instead for that one item.
  library?: IconLibrary;
  // Expo Router path to push when tapped. Most items don't have their view
  // page built yet (see the TODO in QuickAccessGrid) and are still inert.
  route?: string;
};

// Shared shape for any HoD approve/reject workflow (Leave, On Duty, ...) -
// see src/features/erp/components/ApprovalRequestsScreen.
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  name: string;
  // Pre-computed display line: "21CSE042 · III CSE-A" for a student,
  // "Associate Professor · CSE" for a faculty member - computed in the data
  // file so the screen component doesn't need to know which kind it is.
  subtitle: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: ApprovalStatus;
};
