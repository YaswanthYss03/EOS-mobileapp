import { apiClient } from "./client";

// Mirrors EOS-backend's new service-requests module (see
// EOSbackend1/src/modules/procurement/service-requests/service-requests.*.ts)
// - mirrors purchase-requests.api.ts exactly, see its own comment for the
// full rationale. Backed by service_indents/service_order_proposals/
// service_orders.

export type ServiceRequestStatus =
  | "pending_hod"
  | "pending_finance"
  | "approved"
  | "rejected_by_hod"
  | "rejected_by_finance"
  | "converted";

export type ServiceRequestUserRef = { id: number; email: string };

export type ServiceRequest = {
  id: number;
  title: string | null;
  department: { id: number; name: string };
  raised_by: ServiceRequestUserRef;
  service_description: string;
  quantity: string | null;
  location: string | null;
  needed_by: string | null;
  status: ServiceRequestStatus;
  hod_reviewer: ServiceRequestUserRef | null;
  hod_reviewed_at: string | null;
  hod_remarks: string | null;
  finance_reviewer: ServiceRequestUserRef | null;
  finance_reviewed_at: string | null;
  finance_remarks: string | null;
  order_number: string | null;
  converted_at: string | null;
  created_at: string;
};

// ───────────────────────────── Secretary: create + own history ─────────────────────────────

export type CreateServiceRequestPayload = {
  department_id: number;
  title: string;
  service_description: string;
  quantity?: string;
  location?: string;
  needed_by?: string; // ISO date string
};

export async function createServiceRequest(
  payload: CreateServiceRequestPayload,
): Promise<ServiceRequest> {
  const { data } = await apiClient.post<{ data: ServiceRequest }>("/me/service-requests", payload);
  return data.data;
}

export async function listMyServiceRequests(): Promise<ServiceRequest[]> {
  const { data } = await apiClient.get<{ data: { data: ServiceRequest[] } }>("/me/service-requests", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

// ───────────────────────────── HoD review queue ─────────────────────────────

export async function listServiceRequestsForHodReview(): Promise<ServiceRequest[]> {
  const { data } = await apiClient.get<{ data: { data: ServiceRequest[] } }>("/me/service-requests", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

export async function hodReviewServiceRequest(
  id: number,
  decision: "approved" | "rejected",
  remarks?: string,
): Promise<ServiceRequest> {
  const { data } = await apiClient.patch<{ data: ServiceRequest }>(
    `/me/service-requests/${id}/hod-review`,
    { decision, remarks },
  );
  return data.data;
}

// ───────────────────────────── Shared status display ─────────────────────────────

export type ServiceRequestStatusTone = "pending" | "positive" | "negative";

const STATUS_META: Record<ServiceRequestStatus, { label: string; tone: ServiceRequestStatusTone }> = {
  pending_hod: { label: "Pending HoD", tone: "pending" },
  pending_finance: { label: "With Finance", tone: "pending" },
  approved: { label: "Approved", tone: "positive" },
  converted: { label: "Converted", tone: "positive" },
  rejected_by_hod: { label: "Rejected by HoD", tone: "negative" },
  rejected_by_finance: { label: "Rejected by Finance", tone: "negative" },
};

export function getServiceRequestStatusMeta(status: ServiceRequestStatus) {
  return STATUS_META[status];
}
