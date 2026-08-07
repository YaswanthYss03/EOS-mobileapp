import { apiClient } from "./client";

// Mirrors EOS-backend's POST /me/create-leaves and GET /me/faculty-leaves
// (see EOS-backend/src/modules/faculty/faculty-leaves/faculty-leaves.service.ts).
// Self-scoped to the calling faculty member. There is no leave_type column on
// faculty_leaves and no leave-balance/quota concept anywhere in the schema.
// overall_status is computed server-side: "rejected" if either approval is
// rejected, "approved" only once both HoD and HR have approved, else "pending".
export type FacultyLeaveApprovalStatus = "pending" | "approved" | "rejected";

export type MyFacultyLeave = {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  hod_approval_status: FacultyLeaveApprovalStatus;
  hr_approval_status: FacultyLeaveApprovalStatus;
  overall_status: FacultyLeaveApprovalStatus;
  created_at: string;
  faculty: { id: number; first_name: string; last_name: string; designation: string };
};

export type CreateFacultyLeavePayload = {
  from_date: string;
  to_date: string;
  reason?: string;
};

export async function createFacultyLeave(payload: CreateFacultyLeavePayload): Promise<MyFacultyLeave> {
  const { data } = await apiClient.post<{ data: MyFacultyLeave }>("/me/create-leaves", payload);
  return data.data;
}

export async function listFacultyLeaves(): Promise<MyFacultyLeave[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// Same GET /me/faculty-leaves endpoint as above, but for an HR Payroll (or
// HoD) caller - the backend does NOT self-scope those two roles, so this
// returns every faculty member's requests, not just the caller's own (see
// FacultyLeavesService.findAll - only ROLES.FACULTY forces where.faculty_id).
export async function listFacultyLeavesForReview(): Promise<MyFacultyLeave[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// PATCH /me/faculty-leaves/:id (HR Payroll only sets hr_approval_status, and
// only once hod_approval_status is already 'approved' - the backend 409s
// with "HR approval requires HoD approval first" otherwise; that message is
// surfaced as-is via getApiErrorMessage rather than a generic fallback).
export async function reviewFacultyLeaveAsHr(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyLeave> {
  const { data } = await apiClient.patch<{ data: MyFacultyLeave }>(`/me/faculty-leaves/${id}`, {
    hr_approval_status: decision,
  });
  return data.data;
}
