import { apiClient } from "./client";

// The HoD's read-only view of "Faculty Feedback" - the existing
// end_semester feedback_forms mechanism (students rate their own
// subject-handling faculty; the form itself is authored by the Academic
// Coordinator, not the HoD - see EOS-backend's feedback module). Scoped
// server-side to forms whose class belongs to the caller's own department
// (see hod-faculty-feedback.service.ts).

export type HodFacultyFeedbackForm = {
  id: number;
  title: string;
  is_published: boolean;
  created_at: string;
  question_count: number;
  class_label: string;
};

export async function getFacultyFeedbackForms(): Promise<HodFacultyFeedbackForm[]> {
  const { data } = await apiClient.get<{ data: HodFacultyFeedbackForm[] }>("/hod/faculty-feedback/forms");
  return data.data;
}

export type HodFacultyFeedbackQuestionResult = {
  id: number;
  question_text: string;
  sequence_no: number | null;
  question_type: "rating" | "text";
  response_count: number;
  average_rating?: number | null;
  rating_distribution?: Record<string, number>;
  responses?: (string | null)[];
};

export type HodFacultyFeedbackRow = {
  mapping_id: number;
  faculty_id: number;
  faculty_name: string;
  subject_id: number;
  subject_name: string;
  questions: HodFacultyFeedbackQuestionResult[];
};

export type HodFacultyFeedbackResults = {
  form_id: number;
  title: string;
  form_type: "end_semester";
  target_student_count: number;
  respondent_count: number;
  rows: HodFacultyFeedbackRow[];
};

export async function getFacultyFeedbackResults(formId: number): Promise<HodFacultyFeedbackResults> {
  const { data } = await apiClient.get<{ data: HodFacultyFeedbackResults }>(
    `/hod/faculty-feedback/forms/${formId}/results`,
  );
  return data.data;
}
