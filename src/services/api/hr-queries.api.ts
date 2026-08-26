import { apiClient } from "./client";

/**
 * HR help-desk tickets — the "HR Payroll" self-service tile.
 *
 * Backed by the real `hr_payroll_requests` table via
 * EOSbackend1/src/modules/faculty/hr-queries. Self-scoped: GET returns only the
 * caller's own tickets (requested_by_user_id from the JWT), so nothing here
 * takes a user id.
 *
 * NOT the same thing as `/me/hr-payroll`, which is salary_payments — payroll
 * processing done BY HR, not tickets raised by an employee.
 */

/**
 * The real values allowed by hr_payroll_requests_status_check:
 * 'submitted' | 'under_review' | 'resolved'.
 *
 * Note there is NO 'rejected' state, and it is under_score, not "under-review".
 * Inventing a status here would be written and then read back as a value the
 * CHECK constraint rejects.
 */
export type HrQueryStatus = "submitted" | "under_review" | "resolved";

export type HrQuery = {
  id: number;
  /** Human reference like "HRM-2026-118", derived server-side from id + created_at. */
  ticket_no: string;
  category: string;
  subject: string;
  description: string | null;
  file_url: string | null;
  status: HrQueryStatus;
  /** The HR person handling it, resolved server-side to a real name. */
  assigned_to_name: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

/** GET /me/hr-queries — the caller's own tickets, newest first. */
export async function listMyHrQueries(): Promise<HrQuery[]> {
  const { data } = await apiClient.get<{ data: HrQuery[] }>("/me/hr-queries");
  return data.data;
}

/**
 * POST /me/hr-queries — multipart, `file` optional (10 MB cap server-side).
 *
 * Sent as FormData because the endpoint is multipart even when no file is
 * attached; posting JSON to it would be rejected.
 */
export async function createHrQuery(input: {
  category: string;
  subject: string;
  description?: string;
  file?: { uri: string; name: string; mimeType: string };
}): Promise<HrQuery> {
  const formData = new FormData();
  formData.append("category", input.category);
  formData.append("subject", input.subject);
  if (input.description) formData.append("description", input.description);
  if (input.file) {
    // React Native's FormData takes { uri, name, type } for a file part - this
    // is not a real Blob, so the DOM FormData typings do not apply.
    formData.append("file", {
      uri: input.file.uri,
      name: input.file.name,
      type: input.file.mimeType,
    } as unknown as Blob);
  }

  const { data } = await apiClient.post<{ data: HrQuery }>("/me/hr-queries", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
