import { useAuth } from "@/context/AuthContext";

export type Role =
  | "student"
  | "parent"
  | "employee"
  | "admin"
  | "iqac"
  | "warden"
  | "hod"
  | "coe"
  | "placement"
  | "billing"
  | "hr-payroll"
  | "media-room"
  | "secretary";

// EOS-backend has 17 roles (see EOS-backend/prisma/seed.ts) but this app only
// has dedicated ERP dashboards/tabs for a subset of them - any backend role
// without one falls back to "employee" (the generic staff view) rather than
// crashing or showing nothing.
const BACKEND_ROLE_MAP: Record<string, Role> = {
  admin: "admin",
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
  alumni: "employee",
};

export function mapBackendRole(backendRole: string): Role {
  return BACKEND_ROLE_MAP[backendRole] ?? "employee";
}

export function useRole(): Role {
  const { user } = useAuth();
  return user ? mapBackendRole(user.role) : "student";
}
