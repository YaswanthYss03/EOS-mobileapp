export const studentDashboard = {
  attendancePercent: 87,
  cgpa: 8.42,
};

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
};

export const quickAccessItems: QuickAccessItem[] = [
  { id: "attendance", label: "Attendance", icon: "calendar-outline" },
  { id: "fee", label: "Fee", icon: "cash-outline" },
  { id: "apply-leave", label: "Apply Leave", icon: "log-out-outline" },
  { id: "apply-od", label: "Apply OD", icon: "airplane-outline" },
  { id: "no-due", label: "No Due Clearance", icon: "checkmark-done-outline" },
  { id: "library", label: "Library", icon: "library-outline" },
  { id: "exams", label: "Exams", icon: "create-outline" },
  { id: "bonafide", label: "Bonafide Request", icon: "document-text-outline" },
];
