import { apiClient } from "./client";
import type { SubjectRecordDetail } from "./subject-records.api";

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
  // Year of study (1 = first year) when the backend can derive it.
  year?: number | null;
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

// Class-wide Subject Records (every subject taught to this class, not just
// ones the caller personally teaches - see EOS-backend's
// class-mentors.service.ts's findAllForClassMentor, which reuses
// SubjectRecordsService's own grade-distribution/toppers computation). Same
// per-mapping shape as the teaching-scoped /me/subject-records/:id detail.
export async function getMentorClassSubjectRecords(classId: number): Promise<SubjectRecordDetail[]> {
  const { data } = await apiClient.get<{ data: SubjectRecordDetail[] }>(
    `/me/mentee-classes/${classId}/subject-records`,
  );
  return data.data;
}

export type MentorNoDueRow = {
  student_id: number;
  student_id_no: string;
  name: string;
  class_label: string;
  library_cleared: boolean;
  laboratory_cleared: boolean;
  fees_cleared: boolean;
  hostel_cleared: boolean;
  academics_cleared: boolean;
  issued: boolean;
};

export type MentorNoDueResponse = {
  class: { id: number; label: string };
  counts: { in_scope: number; issued: number; pending: number };
  rows: MentorNoDueRow[];
};

// Class-mentor-scoped No Due (this one class only, not the whole
// department like the HoD-facing /hod/no-due) - live fee/library/academics
// dues, same computation as that HoD view, see EOS-backend's
// class-mentors.service.ts's getNoDueForClassMentor.
export async function getMentorClassNoDue(classId: number, search?: string): Promise<MentorNoDueResponse> {
  const { data } = await apiClient.get<{ data: MentorNoDueResponse }>(
    `/me/mentee-classes/${classId}/no-due`,
    { params: search ? { search } : undefined },
  );
  return data.data;
}

export async function approveMentorClassNoDue(
  classId: number,
  studentId: number,
): Promise<{ student_id: number; updated: boolean }> {
  const { data } = await apiClient.patch<{ data: { student_id: number; updated: boolean } }>(
    `/me/mentee-classes/${classId}/no-due/${studentId}`,
    { issue: true },
  );
  return data.data;
}
