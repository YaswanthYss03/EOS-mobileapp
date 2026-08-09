import { apiClient } from "./client";

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

export async function getAllHigherEducation(): Promise<HigherEducationEntry[]> {
  const { data } = await apiClient.get<{ data: HigherEducationEntry[] }>("/student-higher-education");
  return data.data;
}
