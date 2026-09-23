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
  // Only non-null for a Principal-authored request (Switch Account-style
  // independent stage - see faculty-leaves.service.ts's computeOverallStatus).
  // null for every Faculty/HoD/Secretary/HR Payroll/Warden request.
  correspondent_approval_status: FacultyLeaveApprovalStatus | null;
  overall_status: FacultyLeaveApprovalStatus;
  created_at: string;
  // Only present on the HoD/HR-facing lists (getHodFacultyLeaves,
  // listFacultyLeavesForReview) — absent on the self-service
  // listFacultyLeaves() response.
  faculty?: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string;
    departments: { id: number; name: string; code: string } | null;
  };
  /**
   * Resolved server-side from whichever register holds the requester
   * (faculty -> non_teaching_staff -> email). ALWAYS read this for display:
   * `faculty` is genuinely null on a request raised by non-teaching staff
   * (Secretary / HR Payroll / warden), because faculty_id is nullable.
   */
  requester?: {
    kind: "faculty" | "staff" | "principal" | "unknown";
    name: string;
    designation: string | null;
    department: string | null;
  };
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
  // mine:true - self-service screen, always the caller's own requests, even
  // for a HoD (who would otherwise get their department review queue back
  // from this same endpoint - see faculty-leaves.service.ts's findAll).
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100, mine: true },
  });
  return data.data.data;
}

// HoD's own-department queue — same GET endpoint, role-branched server-side
// (see FacultyLeavesService.findAll) — the HoD is the FIRST stage here
// (unlike student leaves, there's no prior mentor gate), so all statuses
// are relevant, no exclusion needed.
export async function getHodFacultyLeaves(): Promise<MyFacultyLeave[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// Same GET /me/faculty-leaves endpoint as above, but for an HR Payroll
// caller - the backend hides any request not yet HoD-approved (see
// FacultyLeavesService.findAll), so this only ever returns requests ready
// for HR action.
export async function listFacultyLeavesForReview(): Promise<MyFacultyLeave[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
  });
  return data.data.data;
}

export async function hodApproveFacultyLeave(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyLeave> {
  const { data } = await apiClient.patch<{ data: MyFacultyLeave }>(`/me/faculty-leaves/${id}`, {
    hod_approval_status: decision,
  });
  return data.data;
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

// Correspondent's "Leave Approval" queue — same GET /me/faculty-leaves
// endpoint, role-branched server-side to only Principal-authored requests
// (correspondent_approval_status non-null), see FacultyLeavesService.findAll.
export async function getCorrespondentLeaveRequests(): Promise<MyFacultyLeave[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// PATCH /me/faculty-leaves/:id (Correspondent only sets
// correspondent_approval_status, on a Principal-authored request only —
// see FacultyLeavesService.update). Independent of hod/hr — never gated on
// them, unlike HR's stage above.
export async function correspondentApproveLeave(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyLeave> {
  const { data } = await apiClient.patch<{ data: MyFacultyLeave }>(`/me/faculty-leaves/${id}`, {
    correspondent_approval_status: decision,
  });
  return data.data;
}
