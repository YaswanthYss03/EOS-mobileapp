import { apiClient } from "./client";

// Mirrors EOS-backend's assignments + student-assignment-status modules
// (see EOSbackend1/src/modules/faculty/assignments/assignments.service.ts's
// getHandledClasses/getAssignmentStudents, and
// student-assignment-status.service.ts). Three-step flow: pick a
// (class, subject) you're mapped to teach -> pick which assignment within
// it -> mark is_submitted per student. There's no dedicated "no due"
// clearance table backing this - the schema's real per-student boolean is
// assignments/student_assignment_status.is_submitted.

export type HandledClass = {
  class_id: number;
  subject_id: number;
  academic_year: string;
  section: string;
  semester: number | null;
  department_name: string;
  subject_name: string;
  subject_code: string;
};

export type Assignment = {
  id: number;
  academic_year: string;
  semester: number;
  sequence_no: number;
  title: string | null;
  class: { id: number; section: string };
  subject: { id: number; name: string; subject_code: string };
};

export type AssignmentStudent = {
  student_id: number;
  student_id_no: string;
  name: string;
  status_id: number | null;
  is_submitted: boolean;
  marked_at: string | null;
};

export async function getHandledClasses(): Promise<HandledClass[]> {
  const { data } = await apiClient.get<{ data: HandledClass[] }>("/me/handled-classes");
  return data.data;
}

export async function getAssignmentsFor(classId: number, subjectId: number): Promise<Assignment[]> {
  const { data } = await apiClient.get<{ data: { data: Assignment[] } }>("/me/assignments", {
    params: { class_id: classId, subject_id: subjectId, limit: 100 },
  });
  return data.data.data;
}

export async function getAssignmentStudents(assignmentId: number): Promise<AssignmentStudent[]> {
  const { data } = await apiClient.get<{ data: AssignmentStudent[] }>(`/me/assignments/${assignmentId}/students`);
  return data.data;
}

// status_id present -> PATCH the existing student_assignment_status row;
// null -> POST a new one. The mobile screen decides which to call based on
// the field GET /me/assignments/:id/students already returns, so no
// dedicated upsert endpoint was needed on the backend.
export async function markAssignmentSubmission(
  statusId: number | null,
  assignmentId: number,
  studentId: number,
  isSubmitted: boolean,
): Promise<{ id: number; is_submitted: boolean; marked_at: string | null }> {
  if (statusId !== null) {
    const { data } = await apiClient.patch<{ data: { id: number; is_submitted: boolean; marked_at: string | null } }>(
      `/student-assignment-status/${statusId}`,
      { is_submitted: isSubmitted },
    );
    return data.data;
  }
  const { data } = await apiClient.post<{ data: { id: number; is_submitted: boolean; marked_at: string | null } }>(
    "/student-assignment-status",
    { assignment_id: assignmentId, student_id: studentId, is_submitted: isSubmitted },
  );
  return data.data;
}
