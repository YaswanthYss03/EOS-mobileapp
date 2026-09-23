import { apiClient } from "./client";

// Shared by every Principal-only institution-wide directory screen that has
// a Batch/Department/Class-with-Section filter row + name-or-roll-no search
// box (Placements, Higher Education, Entrepreneur) - see EOS-backend's
// InstitutionDirectoryQueryDto (student-higher-education/
// student-entrepreneurship) and DrivesController's own institution/*
// routes (placements). All four fields are optional and combinable.
export type InstitutionDirectoryFilters = {
  search?: string;
  batch_id?: number;
  department_id?: number;
  class_id?: number;
};

// The Class+Section dropdown's own options, narrowed by whichever of
// batch_id/department_id is already picked - one shared endpoint
// (GET /drives/institution/classes) reused across all three screens above,
// not duplicated per-module, since "which classes exist for this
// batch/department" is the exact same question regardless of which
// directory is asking it.
export type InstitutionClass = {
  id: number;
  section: string;
  current_semester: number | null;
  batches: { name: string } | null;
  courses: { code: string } | null;
  departments: { code: string; name: string } | null;
};

export async function getInstitutionClasses(params: {
  batch_id?: number;
  department_id?: number;
}): Promise<InstitutionClass[]> {
  const { data } = await apiClient.get<{ data: InstitutionClass[] }>("/drives/institution/classes", { params });
  return data.data;
}
