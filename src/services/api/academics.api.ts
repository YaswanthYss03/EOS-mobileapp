import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/exam-results?semester= (see
// EOSbackend1/src/modules/admissions/students/me-profile/me-exam-results.service.ts).
// Only exams whose marks the backend considers finalised are ever included -
// an exam with no marks entered yet just doesn't appear here.
export type ExamResultSubject = {
  subject_id: number;
  code: string;
  name: string;
  max: number;
  scored: number;
};

export type ExamResultGroup = {
  exam_id: number;
  number: number;
  title: string;
  marks_obtained: number;
  marks_total: number;
  subjects: ExamResultSubject[];
};

export type ExamResultsResponse = {
  semester: number;
  internals: ExamResultGroup[];
  semester_exam: ExamResultGroup | null;
};

export async function getMyExamResults(semester: number): Promise<ExamResultsResponse> {
  const { data } = await apiClient.get<{ data: ExamResultsResponse }>("/me/exam-results", {
    params: { semester },
  });
  return data.data;
}
