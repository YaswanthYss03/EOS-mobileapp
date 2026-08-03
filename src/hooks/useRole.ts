// TODO: pull the real role off src/context/AuthContext once auth is wired up.
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
  | "media-room";

export function useRole(): Role {
  return "student";
}
