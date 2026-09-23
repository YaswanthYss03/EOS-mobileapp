import { apiClient } from "./client";
import type { InstitutionDirectoryFilters } from "./institution-directory.api";

// Principal-only read view of students who've registered interest in
// further studies - see EOS-backend's
// src/modules/student-higher-education/student-higher-education.service.ts.
// At most one row per student (student_id is unique on the real table) -
// never a log of multiple submissions.

export type HigherEducationStudent = {
  id: number;
  student_id_no: string;
  name: string;
  section: string | null;
  department: { code: string; name: string } | null;
  class_id: number | null;
  batch_name: string | null;
  course_code: string | null;
};

export type HigherEducationEntry = {
  id: number;
  preferred_course: string;
  preferred_country: string;
  preferred_university: string | null;
  remarks: string | null;
  created_at: string;
  student: HigherEducationStudent;
};

// `filters` is optional and combinable (search + Batch/Department/Class
// with Section) - omitting it keeps the original "every department at
// once" behavior this endpoint always had (see
// StudentHigherEducationService.findAll).
export async function getAllHigherEducation(filters?: InstitutionDirectoryFilters): Promise<HigherEducationEntry[]> {
  const { data } = await apiClient.get<{ data: HigherEducationEntry[] }>("/student-higher-education", {
    params: filters,
  });
  return data.data;
}

export type MentorHigherEducationEntry = {
  id: number;
  student: { id: number; name: string; student_id_no: string; photo_url: string | null };
  preferred_course: string;
  preferred_country: string;
  preferred_university: string | null;
  remarks: string | null;
  created_at: string;
};

// Class-mentor-scoped (see EOS-backend's class-mentors.service.ts) - every
// student in the caller's own mentored class who has registered interest in
// further studies, not every student college-wide like getAllHigherEducation
// (Principal-only) above.
export async function getMentorClassHigherEducation(classId: number): Promise<MentorHigherEducationEntry[]> {
  const { data } = await apiClient.get<{ data: MentorHigherEducationEntry[] }>(
    `/me/mentee-classes/${classId}/higher-education`,
  );
  return data.data;
}
