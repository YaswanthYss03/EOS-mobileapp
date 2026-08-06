import { apiClient } from "./client";

// Mirrors EOS-backend's POST/GET /me/leaves (see
// EOS-backend/src/modules/admissions/students/me-profile/me-leaves.service.ts
// and me-leaves-list.service.ts). Self-scoped to the calling student via the
// JWT. The real approval chain is two stages - faculty then HOD - not the
// simple pending/approved/rejected a UI mockup might assume.
export type LeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected";

export type MyLeave = {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: LeaveStatus;
  approved_by_faculty: string | null;
  approved_by_hod: string | null;
  created_at: string;
};

export type MyLeavesListResponse = {
  data: MyLeave[];
  page: number;
  page_size: number;
  total: number;
};

export type CreateLeavePayload = {
  from_date: string;
  to_date: string;
  reason?: string;
};

export async function createMyLeave(payload: CreateLeavePayload): Promise<MyLeave> {
  const { data } = await apiClient.post<{ data: MyLeave }>("/me/leaves", payload);
  return data.data;
}

export async function listMyLeaves(params?: {
  status?: LeaveStatus;
  page?: number;
  page_size?: number;
}): Promise<MyLeavesListResponse> {
  const { data } = await apiClient.get<{ data: MyLeavesListResponse }>("/me/leaves", { params });
  return data.data;
}
