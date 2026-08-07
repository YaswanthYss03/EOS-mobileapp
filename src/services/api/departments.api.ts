import { apiClient } from "./client";

// Mirrors EOS-backend's GET /departments (see
// EOSbackend1/src/modules/academic-structure/departments/departments.*.ts).
// No role guard on this endpoint - it's foundational master data, readable
// by any authenticated caller. Used here to let a Secretary pick their own
// department at request-creation time, since a Secretary account has no
// structural department link to resolve it from automatically (no
// non_teaching_staff row in the actual seed data).

export type Department = { id: number; name: string; code: string };

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<{ data: Department[] }>("/departments");
  return data.data;
}
