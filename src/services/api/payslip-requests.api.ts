import { apiClient } from "./client";

// Mirrors EOS-backend's POST /me/payslip-requests and GET /me/payslip-requests
// (see EOS-backend/src/modules/faculty/payslip-requests/payslip-requests.service.ts).
// Self-scoped to the calling faculty member. There are no "remarks" or
// financial figures anywhere on this entity. The real status enum is
// pending/processed/rejected (not "approved"), and the actual payslip is
// delivered only as a `file_url` document link once processed.
export type PayslipRequestStatus = "pending" | "processed" | "rejected";

export type MyPayslipRequest = {
  id: number;
  month: string;
  status: PayslipRequestStatus;
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
  faculty: { id: number; first_name: string; last_name: string; designation: string };
};

export type CreatePayslipRequestPayload = {
  month: string;
  purpose?: string;
};

export async function createPayslipRequest(payload: CreatePayslipRequestPayload): Promise<MyPayslipRequest> {
  const { data } = await apiClient.post<{ data: MyPayslipRequest }>("/me/payslip-requests", payload);
  return data.data;
}

export async function listMyPayslipRequests(): Promise<MyPayslipRequest[]> {
  const { data } = await apiClient.get<{ data: { data: MyPayslipRequest[] } }>("/me/payslip-requests", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// Same GET /me/payslip-requests endpoint as above, but for an HR Payroll
// caller - the backend does NOT self-scope that role, so this returns every
// faculty member's requests, not just the caller's own (see
// PayslipRequestsService.findAll - only ROLES.FACULTY forces where.faculty_id).
export async function listPayslipRequestsForReview(): Promise<MyPayslipRequest[]> {
  const { data } = await apiClient.get<{ data: { data: MyPayslipRequest[] } }>("/me/payslip-requests", {
    params: { limit: 100 },
  });
  return data.data.data;
}

// PATCH /me/payslip-requests/:id (HR Payroll only). No file is required to
// approve - file_url stays null unless attached some other way later.
export async function rejectPayslipRequestAsHr(id: number): Promise<MyPayslipRequest> {
  const { data } = await apiClient.patch<{ data: MyPayslipRequest }>(`/me/payslip-requests/${id}`, {
    status: "rejected",
  });
  return data.data;
}

export async function approvePayslipRequestAsHr(id: number): Promise<MyPayslipRequest> {
  const { data } = await apiClient.patch<{ data: MyPayslipRequest }>(`/me/payslip-requests/${id}`, {
    status: "processed",
  });
  return data.data;
}
