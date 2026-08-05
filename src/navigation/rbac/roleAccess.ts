import type { Role } from "@/hooks/useRole";

// TODO: which bottom tabs / ERP sections each role can see. Keep this the single
// source of truth so tab visibility, redirects, and guards all read from one place.
export const roleAccess: Record<Role, { tabs: string[] }> = {
  student: { tabs: ["home", "erp", "amenity", "academics", "bus-tracking"] },
  parent: { tabs: ["home", "erp", "academics", "bus-tracking"] },
  employee: { tabs: ["home", "erp", "amenity"] },
  admin: { tabs: ["home", "erp"] },
  iqac: { tabs: ["home", "erp"] },
  warden: { tabs: ["home", "erp"] },
  hod: { tabs: ["home", "erp", "academics"] },
  coe: { tabs: ["home", "erp", "academics"] },
  placement: { tabs: ["home", "erp", "academics"] },
  billing: { tabs: ["home", "erp"] },
  "hr-payroll": { tabs: ["home", "erp"] },
  "media-room": { tabs: ["home", "erp"] },
  secretary: { tabs: ["home", "erp", "amenity"] },
};
