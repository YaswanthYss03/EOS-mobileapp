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
