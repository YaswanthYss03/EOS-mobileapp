import { apiClient } from "./client";

// Mirrors EOS-backend's HoD-facing "Assigned Faculty" endpoints (see
// EOS-backend/src/modules/faculty/faculty-mapping/faculty-mapping.service.ts).
// class_subjects is the real source of truth for "which subjects does this
// class have" - nothing here is a fixed/global subject list, it's whatever
// subjects the classes in the selected batch actually carry.
export type HodDepartment = {
  id: number;
  name: string;
  code: string;
};

export type MappingBatch = {
  id: number;
  name: string;
};

export type AssignedFaculty = {
  mapping_id: number;
  id: number;
  name: string;
  designation: string;
  academic_year: string;
};

export type MappingSubject = {
  class_subject_id: number;
  class: { id: number; label: string };
  subject: { id: number; name: string; subject_code: string };
  assigned_faculty: AssignedFaculty | null;
};

export type FacultyOption = {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
};

export async function getMyDepartment(): Promise<HodDepartment> {
  const { data } = await apiClient.get<{ data: HodDepartment }>(
    "/me/faculty-mapping/lookup/my-department",
  );
  return data.data;
}

export async function getMyDepartmentBatches(): Promise<MappingBatch[]> {
  const { data } = await apiClient.get<{ data: MappingBatch[] }>(
    "/me/faculty-mapping/lookup/batches",
  );
  return data.data;
}

export async function getSubjectsForBatch(batchId: number, search?: string): Promise<MappingSubject[]> {
  const { data } = await apiClient.get<{ data: MappingSubject[] }>("/me/faculty-mapping/lookup/subjects", {
    params: { batch_id: batchId, search: search || undefined },
  });
  return data.data;
}

export async function getDepartmentFaculty(departmentId: number): Promise<FacultyOption[]> {
  const { data } = await apiClient.get<{ data: { data: FacultyOption[] } }>("/me/faculty", {
    params: { department_id: departmentId, status: "active", limit: 100 },
  });
  return data.data.data;
}

// There is no "current academic year" concept anywhere in the backend -
// every academic_year value in this system is caller-supplied. This mirrors
// the common Indian academic-year convention (roughly June-May) purely as a
// sensible default for a BRAND NEW assignment; editing an existing one
// always reuses its own stored academic_year instead (see assignFaculty).
function guessCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() >= 5 ? year : year - 1; // month 5 = June
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export async function assignFaculty(params: {
  existingMappingId: number | null;
  existingAcademicYear: string | null;
  facultyId: number;
  subjectId: number;
  classId: number;
}): Promise<void> {
  if (params.existingMappingId !== null) {
    await apiClient.patch(`/me/faculty-mapping/${params.existingMappingId}`, {
      faculty_id: params.facultyId,
    });
    return;
  }
  await apiClient.post("/me/faculty-mapping", {
    faculty_id: params.facultyId,
    subject_id: params.subjectId,
    class_id: params.classId,
    academic_year: params.existingAcademicYear ?? guessCurrentAcademicYear(),
  });
}

export async function clearAssignment(mappingId: number): Promise<void> {
  await apiClient.delete(`/me/faculty-mapping/${mappingId}`);
}
