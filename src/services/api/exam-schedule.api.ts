import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/exam-schedule (see
// EOS-backend/src/modules/admissions/students/me-profile/me-exam-schedule.service.ts).
// Self-scoped to the calling student's own class - only published
// exam_timetable rows are returned. exam_type is whatever real exam_types
// exist in the DB (e.g. "Internal Assessment 1", "Model Examination") - not
// a fixed "internal1/internal2/semester" set.
export type MyExamScheduleRow = {
  id: number;
  exam_type: string;
  academic_year: string;
  semester: number;
  subject_name: string;
  subject_code: string;
  exam_date: string;
  start_time: string;
  end_time: string;
};

export async function getMyExamSchedule(): Promise<MyExamScheduleRow[]> {
  const { data } = await apiClient.get<{ data: MyExamScheduleRow[] }>("/me/exam-schedule");
  return data.data;
}
