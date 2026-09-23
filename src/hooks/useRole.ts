import { useAuth } from "@/context/AuthContext";

export type Role =
  | "student"
  | "parent"
  | "employee"
  | "admin"
  | "principal"
  | "correspondent"
  | "iqac"
  | "warden"
  | "hod"
  | "coe"
  | "placement"
  | "billing"
  | "hr-payroll"
  | "media-room"
  | "secretary"
  | "alumni"
  | "stationary";

// EOS-backend has 18 roles (see EOS-backend/prisma/seed.ts) but this app only
// has dedicated ERP dashboards/tabs for a subset of them - any backend role
// without one falls back to "employee" (the generic staff view) rather than
// crashing or showing nothing.
const BACKEND_ROLE_MAP: Record<string, Role> = {
  admin: "admin",
  principal: "principal",
  // Strict visual replica of Principal (see CorrespondentDashboard.tsx) plus
  // its one new capability, Leave Approval - not the generic employee view.
  correspondent: "correspondent",
  hod: "hod",
  faculty: "employee",
  student: "student",
  parent: "parent",
  coe: "coe",
  placement: "placement",
  library: "employee",
  billing: "billing",
  hr_payroll: "hr-payroll",
  finance: "employee",
  iqac: "iqac",
  secretary: "secretary",
  gate_warden: "warden",
  media_room: "media-room",
  academic_coordinator: "employee",
  // Its own dedicated 2-tab (Home/Campus) experience now - see
  // app/(tabs)/_layout.tsx's isAlumni branch - not the generic employee view.
  alumni: "alumni",
  // Its own vendor portal (queue of paid print requests to fulfill) - see
  // app/(tabs)/erp/index.tsx's DASHBOARDS registry - not the generic
  // employee view.
  stationary: "stationary",
};

export function mapBackendRole(backendRole: string): Role {
  return BACKEND_ROLE_MAP[backendRole] ?? "employee";
}

export function useRole(): Role {
  const { user } = useAuth();
  return user ? mapBackendRole(user.role) : "student";
}
