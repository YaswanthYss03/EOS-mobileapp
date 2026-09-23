import { Directory, File, Paths } from "expo-file-system";
import { apiClient, getAuthToken } from "./client";

// Mirrors EOS-backend's GET /me/exam-results?semester= (see
// EOSbackend1/src/modules/admissions/students/me-profile/me-exam-results.service.ts).
// Only exams whose marks the backend considers finalised are ever included -
// an exam with no marks entered yet just doesn't appear here.
export type ExamResultSubject = {
  subject_id: number;
  code: string;
  name: string;
  credits: number | null;
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

// GET /me/exam-results/:semester/marksheet - a rendered PDF, not JSON. Same
// download-to-cache-then-hand-back-a-File pattern as fees.api.ts's
// downloadFeeReceipt. 404s (SEMESTER_EXAM_NOT_PUBLISHED) if the end-semester
// exam for this semester hasn't had its results published yet - same
// condition that already shows "Results awaited" on the Semester exam tab.
export async function downloadMySemesterMarksheet(semester: number) {
  const token = getAuthToken();
  const directory = new Directory(Paths.cache, "marksheets");
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const destination = new File(directory, `Marksheet-Sem${semester}.pdf`);

  return File.downloadFileAsync(`${apiClient.defaults.baseURL}/me/exam-results/${semester}/marksheet`, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });
}
