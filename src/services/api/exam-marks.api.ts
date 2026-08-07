import { apiClient } from "./client";

// Mirrors EOS-backend's faculty exam marks endpoints (see
// EOS-backend/src/modules/faculty/exam-marks/exam-marks.service.ts).
// Self-scoped to the calling faculty - exam_marks entry is a one-shot batch
// per exam_subject_mapping_id: once ANY mark exists for a mapping, a second
// bulk POST is rejected outright (409) and further corrections must go
// through PATCH one row at a time. `locked` on the roster response mirrors
// that rule so the UI can switch modes accordingly.
export type ExamMarksRosterStudent = {
  student_id: number;
  roll_no: string;
  name: string;
  mark_id: number | null;
  marks_obtained: number | string | null;
};

export type ExamMarksRoster = {
  exam_subject_mapping_id: number;
  locked: boolean;
  max_marks: number | string | null;
  students: ExamMarksRosterStudent[];
};

export async function getExamMarksRoster(
  examSubjectMappingId: number,
): Promise<ExamMarksRoster> {
  const { data } = await apiClient.get<{ data: ExamMarksRoster }>(
    `/me/exam-marks/roster/${examSubjectMappingId}`,
  );
  return data.data;
}

export async function enterExamMarks(
  examSubjectMappingId: number,
  maxMarks: number,
  entries: { student_id: number; marks_obtained: number }[],
): Promise<{ exam_subject_mapping_id: number; entered: number }> {
  const { data } = await apiClient.post<{
    data: { exam_subject_mapping_id: number; entered: number };
  }>(`/me/exams/${examSubjectMappingId}/marks`, {
    max_marks: maxMarks,
    entries,
  });
  return data.data;
}

export async function updateExamMark(
  markId: number,
  marksObtained: number,
): Promise<{ id: number }> {
  const { data } = await apiClient.patch<{ data: { id: number } }>(
    `/me/exam-marks/${markId}`,
    { marks_obtained: marksObtained },
  );
  return data.data;
}
