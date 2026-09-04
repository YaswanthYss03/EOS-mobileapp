import type { IconLibrary } from "../types";

// Student-dashboard-only shapes (Quick Access stat cards + Campus icon grid).
// Kept local to this feature folder so other role dashboards (employee, hod,
// principal, ...) that share ../types and ../components/QuickAccessGrid are
// completely unaffected by anything added here.

// Static icon/label/route wiring - never holds a number. The actual
// value/subtitle/progress come from useStudentDashboardData (real /me/*
// endpoints) and get merged onto these in StudentDashboard.tsx.
export type StatCardConfig = {
  id: string;
  label: string;
  icon: string;
  library?: IconLibrary;
  route?: string;
};

export type CampusItemConfig = {
  id: string;
  label: string;
  icon: string;
  library?: IconLibrary;
  route?: string;
};

export type StatCardItem = StatCardConfig & {
  value: string;
  subtitle: string;
  progress: number;
};

export type CampusItem = CampusItemConfig & {
  value: string;
};
