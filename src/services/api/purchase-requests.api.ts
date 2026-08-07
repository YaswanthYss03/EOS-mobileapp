import { apiClient } from "./client";

// Mirrors EOS-backend's new purchase-requests module (see
// EOSbackend1/src/modules/procurement/purchase-requests/purchase-requests.*.ts)
// - a self-service layer over the existing purchase_indents/
// purchase_order_proposals/purchase_orders tables implementing: Secretary
// creates -> HoD reviews -> Finance reviews -> Admin converts to a
// purchase_orders record. Distinct from the older, Admin-only
// /purchase-indents etc. endpoints (which enforce the opposite review
// order and have no self-scoping) - both read/write the same tables.

export type PurchaseRequestStatus =
  | "pending_hod"
  | "pending_finance"
  | "approved"
  | "rejected_by_hod"
  | "rejected_by_finance"
  | "converted";

export type PurchaseRequestUserRef = { id: number; email: string };

export type PurchaseRequest = {
  id: number;
  title: string;
  department: { id: number; name: string };
  raised_by: PurchaseRequestUserRef;
  purpose: string | null;
  quantity: number;
  needed_by: string | null;
  status: PurchaseRequestStatus;
  hod_reviewer: PurchaseRequestUserRef | null;
  hod_reviewed_at: string | null;
  hod_remarks: string | null;
  finance_reviewer: PurchaseRequestUserRef | null;
  finance_reviewed_at: string | null;
  finance_remarks: string | null;
  order_number: string | null;
  converted_at: string | null;
  created_at: string;
};

// ───────────────────────────── Secretary: create + own history ─────────────────────────────

export type CreatePurchaseRequestPayload = {
  department_id: number;
  item_name: string;
  quantity: number;
  purpose?: string;
  needed_by?: string; // ISO date string
};

export async function createPurchaseRequest(
  payload: CreatePurchaseRequestPayload,
): Promise<PurchaseRequest> {
  const { data } = await apiClient.post<{ data: PurchaseRequest }>("/me/purchase-requests", payload);
  return data.data;
}

// Fetched once, unfiltered (limit generous enough for a single secretary's
// own history) - matching the sibling Student Leave/OD screens' pattern.
export async function listMyPurchaseRequests(): Promise<PurchaseRequest[]> {
  const { data } = await apiClient.get<{ data: { data: PurchaseRequest[] } }>("/me/purchase-requests", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

// ───────────────────────────── HoD review queue ─────────────────────────────
// Same GET /me/purchase-requests endpoint, auto-scoped by the backend to
// the HoD's own department (via their own faculty row).

export async function listPurchaseRequestsForHodReview(): Promise<PurchaseRequest[]> {
  const { data } = await apiClient.get<{ data: { data: PurchaseRequest[] } }>("/me/purchase-requests", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

// HoD's only two moves on a 'pending_hod' request: approve (forwards to
// Finance -> 'pending_finance') or reject ('rejected_by_hod', terminal).
export async function hodReviewPurchaseRequest(
  id: number,
  decision: "approved" | "rejected",
  remarks?: string,
): Promise<PurchaseRequest> {
  const { data } = await apiClient.patch<{ data: PurchaseRequest }>(
    `/me/purchase-requests/${id}/hod-review`,
    { decision, remarks },
  );
  return data.data;
}

// ───────────────────────────── Shared status display ─────────────────────────────

export type PurchaseRequestStatusTone = "pending" | "positive" | "negative";

const STATUS_META: Record<PurchaseRequestStatus, { label: string; tone: PurchaseRequestStatusTone }> = {
  pending_hod: { label: "Pending HoD", tone: "pending" },
  pending_finance: { label: "With Finance", tone: "pending" },
  approved: { label: "Approved", tone: "positive" },
  converted: { label: "Converted", tone: "positive" },
  rejected_by_hod: { label: "Rejected by HoD", tone: "negative" },
  rejected_by_finance: { label: "Rejected by Finance", tone: "negative" },
};

export function getPurchaseRequestStatusMeta(status: PurchaseRequestStatus) {
  return STATUS_META[status];
}
