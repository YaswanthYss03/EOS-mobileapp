import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/fees response (see
// EOS-backend/src/modules/admissions/students/me-profile/me-fees.service.ts).
// Self-scoped to the calling student. `demands` is one row per
// student_fee_demand_mapping (e.g. a semester's tuition, or a hostel/transport
// fee) with paid/due/status computed server-side from the linked
// fee_payments rows. `payments` is the flat receipt history across all
// demands. There is no payment gateway wired up yet - this is view-only.
export type FeeStatus = "paid" | "partial" | "pending";

export type PaymentMode = "cash" | "card" | "upi" | "dd" | "netbanking";

export type MyFeeDemand = {
  id: number;
  fee_structure_name: string;
  academic_year: string;
  semester: number | null;
  total: number;
  paid: number;
  due: number;
  status: FeeStatus;
};

export type MyFeePayment = {
  id: number;
  demand_id: number;
  fee_structure_name: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: PaymentMode | null;
  receipt_no: string;
  is_partial: boolean;
};

export type MyFeesResponse = {
  demands: MyFeeDemand[];
  payments: MyFeePayment[];
};

export async function getMyFees(): Promise<MyFeesResponse> {
  const { data } = await apiClient.get<{ data: MyFeesResponse }>("/me/fees");
  return data.data;
}
