import { apiClient } from "./client";

// Mirrors EOS-backend's POST/GET /me/leaves and POST /me/leaves/:id/attachment
// (see EOS-backend/src/modules/admissions/students/me-profile/me-leaves.service.ts
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
  also_on_hostel_leave: boolean;
  attachment_url: string | null;
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
  also_on_hostel_leave?: boolean;
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

// POST /me/leaves/:id/attachment - multipart, field name "certificate"
// (matches the backend's FileInterceptor('certificate')). Same FormData
// pattern already used by lms.api.ts's submitLmsTask/uploadFolderResource.
export async function uploadLeaveAttachment(
  leaveId: number,
  file: { uri: string; name: string; mimeType: string },
): Promise<{ id: number; attachment_url: string }> {
  const formData = new FormData();
  formData.append("certificate", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { id: number; attachment_url: string } }>(
    `/me/leaves/${leaveId}/attachment`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}
