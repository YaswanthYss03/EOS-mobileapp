import { apiClient } from "./client";

// Mirrors EOS-backend's bonafide self-service endpoints (see
// EOS-backend/src/modules/admissions/students/me-profile/me-bonafide-requests.service.ts
// and .../bonafide-reasons/bonafide-reasons.service.ts). Reasons is a public
// reference list (same convention as GET /exam-types); the request itself
// is self-scoped to the calling student via the JWT. There is no
// "copy type" (signed/unsigned) column anywhere in the schema.

export type BonafideReason = {
  id: number;
  reason_text: string;
};

export async function listBonafideReasons(): Promise<BonafideReason[]> {
  const { data } = await apiClient.get<{ data: BonafideReason[] }>("/bonafide-reasons");
  return data.data;
}

export type BonafideRequestStatus = "pending" | "issued" | "rejected";

export type MyBonafideRequest = {
  id: number;
  reason_id: number;
  reason_text: string;
  status: BonafideRequestStatus;
  requested_at: string;
  issued_at: string | null;
  file_url: string | null;
};

export async function createMyBonafideRequest(reasonId: number): Promise<MyBonafideRequest> {
  const { data } = await apiClient.post<{ data: MyBonafideRequest }>("/me/bonafide-requests", {
    reason_id: reasonId,
  });
  return data.data;
}
