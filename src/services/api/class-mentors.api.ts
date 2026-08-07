import { apiClient } from "./client";

// Mirrors EOS-backend's faculty self-service mentee endpoints (see
// EOS-backend/src/modules/faculty/class-mentors/class-mentors.service.ts).
// Self-scoped via class_mentors - a faculty only ever sees classes they are
// the assigned mentor of. CGPA/arrears have no stored column anywhere in
// the backend schema - both are derived server-side from exam_marks using
// the same Anna-University grading bands as Subject Records, so treat them
// as a best-effort approximation, not an official semester result.
export type MentorClass = {
  class_id: number;
  label: string;
  section: string;
  department: { id: number; name: string; code: string };
  academic_year: string;
};

export async function getMyMentorClasses(): Promise<MentorClass[]> {
  const { data } = await apiClient.get<{ data: MentorClass[] }>("/me/mentee-classes");
  return data.data;
}

export type ClassResultStudent = {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  attendance_percent: number | null;
  cgpa: number | null;
  arrears: number;
  mentor_name: string;
  guardian_name: string | null;
  guardian_relation: "Father" | "Mother" | null;
  contact: string | null;
};

export type ClassResult = {
  class: { id: number; label: string };
  department: { id: number; name: string; code: string };
  academic_year: string;
  mentor: { id: number; name: string };
  students: ClassResultStudent[];
};

export async function getMentorClassResult(classId: number): Promise<ClassResult> {
  const { data } = await apiClient.get<{ data: ClassResult }>(
    `/me/mentee-classes/${classId}/students`,
  );
  return data.data;
}
