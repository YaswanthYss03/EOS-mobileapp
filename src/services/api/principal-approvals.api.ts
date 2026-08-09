import { apiClient } from "./client";

// Principal-only Approvals - purchase & service proposals only (the only
// two approval chains that exist as real tables in the schema). Flow:
// pending -> hod_approved -> principal_approved -> finance_approved
// (terminal), or rejected at any point. This list is exactly what's
// hod_approved and not yet principal-reviewed - see EOS-backend's
// src/modules/principal-approvals/principal-approvals.service.ts.

export type PrincipalApprovalType = "purchase" | "service";

export type PrincipalApprovalItem = {
  id: number;
  type: PrincipalApprovalType;
  title: string;
  detail: string | null;
  needed_by: string | null;
  department_code: string | null;
  department_name: string | null;
  requested_by: string;
  raised_at: string;
  hod_approved_at: string | null;
  estimated_amount: number | null;
};

export type PrincipalApprovalsList = {
  total: number;
  items: PrincipalApprovalItem[];
};

export async function getPendingApprovals(): Promise<PrincipalApprovalsList> {
  const { data } = await apiClient.get<{ data: PrincipalApprovalsList }>("/principal-approvals/pending");
  return data.data;
}

export async function approveRequest(type: PrincipalApprovalType, id: number): Promise<void> {
  await apiClient.patch(`/principal-approvals/${type}/${id}/approve`);
}

export async function rejectRequest(type: PrincipalApprovalType, id: number): Promise<void> {
  await apiClient.patch(`/principal-approvals/${type}/${id}/reject`);
}
