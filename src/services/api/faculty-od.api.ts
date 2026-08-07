import { apiClient } from "./client";

// Mirrors EOS-backend's POST /me/create-od and GET /me/faculty-od (see
// EOS-backend/src/modules/faculty/faculty-od/faculty-od.service.ts).
// Self-scoped to the calling faculty member. There is no od_type column on
// faculty_od_requests and no OD-balance/quota concept anywhere in the
// schema. overall_status is computed server-side: "rejected" if either
// approval is rejected, "approved" only once both HoD and HR have approved,
// else "pending".
export type FacultyOdApprovalStatus = "pending" | "approved" | "rejected";

export type MyFacultyOd = {
  id: number;
  from_date: string;
  to_date: string;
  place: string | null;
  purpose: string | null;
  hod_approval_status: FacultyOdApprovalStatus;
  hr_approval_status: FacultyOdApprovalStatus;
  overall_status: FacultyOdApprovalStatus;
  created_at: string;
  // Only present on the HoD/HR-facing lists (getHodFacultyOds,
  // listFacultyOdForReview) — absent on the self-service listFacultyOd()
  // response.
  faculty?: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string;
    departments: { id: number; name: string; code: string } | null;
  };
};

export type CreateFacultyOdPayload = {
  from_date: string;
  to_date: string;
  place?: string;
  purpose?: string;
};

export async function createFacultyOd(payload: CreateFacultyOdPayload): Promise<MyFacultyOd> {
  const { data } = await apiClient.post<{ data: MyFacultyOd }>("/me/create-od", payload);
  return data.data;
}

export async function listFacultyOd(): Promise<MyFacultyOd[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyOd[] } }>("/me/faculty-od", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// HoD's own-department queue — same GET endpoint, role-branched server-side
// (see FacultyOdService.findAll) — the HoD is the FIRST stage here, so all
// statuses are relevant, no exclusion needed.
export async function getHodFacultyOds(): Promise<MyFacultyOd[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyOd[] } }>("/me/faculty-od", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// Same GET /me/faculty-od endpoint as above, but for an HR Payroll caller -
// the backend hides any request not yet HoD-approved (see
// FacultyOdService.findAll), so this only ever returns requests ready for
// HR action.
export async function listFacultyOdForReview(): Promise<MyFacultyOd[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyOd[] } }>("/me/faculty-od", {
    params: { limit: 100 },
  });
  return data.data.data;
}

export async function hodApproveFacultyOd(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyOd> {
  const { data } = await apiClient.patch<{ data: MyFacultyOd }>(`/me/faculty-od/${id}`, {
    hod_approval_status: decision,
  });
  return data.data;
}

// PATCH /me/faculty-od/:id (HR Payroll only sets hr_approval_status, and
// only once hod_approval_status is already 'approved' - the backend 409s
// with "HR approval requires HoD approval first" otherwise; that message is
// surfaced as-is via getApiErrorMessage rather than a generic fallback).
export async function reviewFacultyOdAsHr(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyOd> {
  const { data } = await apiClient.patch<{ data: MyFacultyOd }>(`/me/faculty-od/${id}`, {
    hr_approval_status: decision,
  });
  return data.data;
}
