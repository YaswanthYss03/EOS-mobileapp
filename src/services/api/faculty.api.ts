import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/faculty-directory (see
// EOSbackend1/src/modules/admissions/students/me-profile/me-faculty-directory.service.ts)
// - a minimal, student-safe faculty picker (name + department only, no HR
// fields). Institution-wide, not scoped to the caller's own department.

export type FacultyDirectoryEntry = {
  id: number;
  name: string;
  department_name: string;
};

export async function getFacultyDirectory(): Promise<FacultyDirectoryEntry[]> {
  const { data } = await apiClient.get<{ data: FacultyDirectoryEntry[] }>("/me/faculty-directory");
  return data.data;
}
