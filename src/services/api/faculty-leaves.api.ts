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
