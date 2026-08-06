import { apiClient } from "./client";

// Mirrors EOS-backend's student feedback endpoints (see
// EOS-backend/src/modules/feedback/feedback/{student-feedback.controller,
// feedback.service}.ts). Feedback is form-based, not a single fixed shape:
// an Academic Coordinator creates a form with an arbitrary list of
// questions, each either "rating" (1-5) or "text" (free response) - a
// student can be targeted by multiple forms (their own class, their batch,
// or institute-wide), and a form can't be resubmitted once answered.

export type FeedbackQuestionType = "rating" | "text";

export type FeedbackFormSummary = {
  id: number;
  title: string;
  question_count: number;
  completed: boolean;
};

export type FeedbackFormQuestion = {
  id: number;
  question_text: string;
  sequence_no: number;
  question_type: FeedbackQuestionType;
  response_text: string | null;
  rating_value: number | null;
  rating_label: string | null;
};

export type FeedbackFormDetail = {
  id: number;
  title: string;
  completed: boolean;
  questions: FeedbackFormQuestion[];
};

export async function listMyFeedbackForms(): Promise<FeedbackFormSummary[]> {
  const { data } = await apiClient.get<{ data: FeedbackFormSummary[] }>("/feedback/student/forms");
  return data.data;
}

export async function getMyFeedbackForm(formId: number): Promise<FeedbackFormDetail> {
  const { data } = await apiClient.get<{ data: FeedbackFormDetail }>(`/feedback/student/forms/${formId}`);
  return data.data;
}

export type SubmitFeedbackResponseItem = {
  question_id: number;
  response_text?: string;
  rating_value?: number;
};

export async function submitMyFeedbackResponses(
  formId: number,
  responses: SubmitFeedbackResponseItem[],
): Promise<{ form_id: number; submitted_questions: number }> {
  const { data } = await apiClient.post<{ data: { form_id: number; submitted_questions: number } }>(
    `/feedback/student/forms/${formId}/responses`,
    { responses },
  );
  return data.data;
}
