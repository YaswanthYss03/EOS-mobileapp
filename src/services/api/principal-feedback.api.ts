import { apiClient } from "./client";

// Correspondent/Principal-only institution-wide Feedback overview - see
// EOS-backend's src/modules/principal-feedback/principal-feedback.service.ts.
// Rolls up every feedback_forms row (general + end-semester matrix forms
// from the Academic Coordinator's feedback module) - everything here is
// computed live from real feedback_forms/feedback_responses/
// feedback_faculty_responses rows, no stored summary table.

export type PrincipalFeedbackRecentForm = {
  id: number;
  title: string;
  form_type: string;
  category: string | null;
  is_published: boolean;
  created_at: string;
  class_section: string | null;
  batch_name: string | null;
  target_student_count: number;
  respondent_count: number;
  response_rate_pct: number | null;
  average_rating: number | null;
};

export type PrincipalFeedbackOverview = {
  total_forms: number;
  published_forms: number;
  draft_forms: number;
  total_responses: number;
  total_target_students: number;
  total_respondents: number;
  overall_response_rate_pct: number | null;
  overall_average_rating: number | null;
  recent_forms: PrincipalFeedbackRecentForm[];
};

export async function getPrincipalFeedbackOverview(filters?: {
  department_id?: number;
  batch_id?: number;
}): Promise<PrincipalFeedbackOverview> {
  const { data } = await apiClient.get<{ data: PrincipalFeedbackOverview }>("/principal-feedback/overview", {
    params: filters,
  });
  return data.data;
}
