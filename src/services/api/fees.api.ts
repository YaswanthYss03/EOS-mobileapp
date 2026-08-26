import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/fees response (see
// EOS-backend/src/modules/admissions/students/me-profile/me-fees.service.ts).
// Self-scoped to the calling student. `demands` is one row per
// student_fee_demand_mapping (e.g. a semester's tuition, or a hostel/transport
// fee) with paid/due/status computed server-side from the linked
// fee_payments rows. `payments` is the flat receipt history across all
// demands. Paying online goes through the Razorpay gateway functions below
// (see EOSbackend1's FeePaymentService.createGatewayOrder/verifyGatewayPayment) -
// mapping-level, not tied to any one fee_structure_item, matching this
// screen's own lump total/paid/due-per-demand UI (no category breakdown).
export type FeeStatus = "paid" | "partial" | "pending";

export type PaymentMode = "cash" | "card" | "upi" | "dd" | "netbanking" | "razorpay";

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

export type FeePaymentOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

export type VerifyFeePaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type FeePaymentVerifyResult = {
  fee_payment_id: number;
  amount_paid: number;
  receipt_no: string;
};

/**
 * POST /me/fees/demands/:id/payment-order — stages a Razorpay order for
 * this one demand (mapping-level, up to its outstanding amount). The real
 * payment is only recorded once verifyFeePayment() confirms the signature.
 */
export async function createFeePaymentOrder(
  demandId: number,
  amount: number,
): Promise<FeePaymentOrder> {
  const { data } = await apiClient.post<{ data: FeePaymentOrder }>(
    `/me/fees/demands/${demandId}/payment-order`,
    { amount },
  );
  return data.data;
}

export async function verifyFeePayment(
  payload: VerifyFeePaymentPayload,
): Promise<FeePaymentVerifyResult> {
  const { data } = await apiClient.post<{ data: FeePaymentVerifyResult }>(
    "/me/fees/payment-order/verify",
    payload,
  );
  return data.data;
}
