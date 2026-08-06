import { apiClient } from "./client";

// Mirrors EOS-backend's GET /student-assignment-status (see
// EOS-backend/src/modules/faculty/student-assignment-status/student-assignment-status.service.ts).
// Auto-scoped to the caller's own student_id when called by a STUDENT - no
// self-scoping query params needed. A row only exists once a faculty member
// has explicitly marked it, so "no row for this assignment" is a real
// distinct state from "row exists with is_submitted: false" - there is no
// dedicated "no-due clearance" concept anywhere in the backend, this page
// is built entirely from real per-assignment submission marks.
export type MyAssignmentStatusRow = {
  id: number;
  is_submitted: boolean;
  assignment: {
    id: number;
    sequence_no: number;
    semester: number;
    subject: { id: number; name: string; subject_code: string };
  };
};

type PaginatedResponse = {
  data: MyAssignmentStatusRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function listMyAssignmentStatuses(): Promise<MyAssignmentStatusRow[]> {
  const { data } = await apiClient.get<{ data: PaginatedResponse }>("/student-assignment-status", {
    params: { limit: 100 },
  });
  return data.data.data;
}
