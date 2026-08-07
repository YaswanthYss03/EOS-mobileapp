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
  // Only present on the HoD-facing list (getHodFacultyLeaves) — absent on
  // the self-service listFacultyLeaves() response.
  faculty?: {
    id: number;
    first_name: string;
    last_name: string;
    designation: string;
    departments: { id: number; name: string; code: string } | null;
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
  const { data } = await apiClient.get<{ data: { data: MyFacultyLeave[] } }>("/me/faculty-leaves", {
    params: { limit: 100 },
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

export async function hodApproveFacultyLeave(
  id: number,
  decision: "approved" | "rejected",
): Promise<MyFacultyLeave> {
  const { data } = await apiClient.patch<{ data: MyFacultyLeave }>(`/me/faculty-leaves/${id}`, {
    hod_approval_status: decision,
  });
  return data.data;
}
