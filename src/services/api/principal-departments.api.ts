import { apiClient } from "./client";

// Principal-only Departments & HoDs overview - see EOS-backend's
// src/modules/principal-departments/principal-departments.service.ts.
// HoD identity comes from faculty.department_id + the caller's role (there
// is no dedicated "department_hod" mapping table). Placement% is "of
// students who applied to at least one drive, % placed" - there's no
// stored eligibility/graduating flag to compute a whole-roster rate
// against.

export type PrincipalDepartmentRow = {
  id: number;
  code: string;
  name: string;
  hod_name: string | null;
  students: number;
  faculty: number;
  attendance_pct: number | null;
  placement_pct: number | null;
  placement_applicants: number;
};

export type PrincipalDepartmentsOverview = {
  total_departments: number;
  departments: PrincipalDepartmentRow[];
};

export async function getPrincipalDepartmentsOverview(): Promise<PrincipalDepartmentsOverview> {
  const { data } = await apiClient.get<{ data: PrincipalDepartmentsOverview }>("/principal-departments/overview");
  return data.data;
}
