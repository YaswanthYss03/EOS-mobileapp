import { apiClient } from "./client";

// Mirrors EOS-backend's stationary module (see
// EOSbackend1/src/modules/stationary/stationary.*.ts) - the print/xerox
// shop request payment gateway, same Razorpay order-then-verify shape as
// wallet top-up (see wallet.api.ts). `amount` is always server-computed
// from total_pages * copies * ₹2/page - never trusted from the client.

export type StationaryOrientation = "portrait" | "landscape";
export type StationaryColorMode = "color" | "bw";
export type StationaryPaperSize = "A4" | "A3" | "A5" | "Letter" | "Legal";
export type StationarySides = "Single-sided" | "Double-sided";
export type StationaryBinding = "No binding" | "Spiral binding" | "Calico binding";

export type CreateStationaryOrderPayload = {
  file_summary?: string;
  total_pages: number;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize;
  sides: StationarySides;
  binding: StationaryBinding;
};

export type StationaryOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

export async function createStationaryOrder(
  payload: CreateStationaryOrderPayload,
): Promise<StationaryOrder> {
  const { data } = await apiClient.post<{ data: StationaryOrder }>(
    "/me/stationary-requests/order",
    payload,
  );
  return data.data;
}

export type VerifyStationaryPaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type StationaryPaymentResult = {
  id: number;
  amount: number;
  status: "paid";
};

export async function verifyStationaryPayment(
  payload: VerifyStationaryPaymentPayload,
): Promise<StationaryPaymentResult> {
  const { data } = await apiClient.post<{ data: StationaryPaymentResult }>(
    "/me/stationary-requests/order/verify",
    payload,
  );
  return data.data;
}

// Every status a request can be in across its whole lifecycle - the first
// two are set only by this student-payment flow (createOrder/
// verifyPayment); the rest are set only by a Stationary-vendor account via
// the separate vendor portal (see stationary-vendor.api.ts) once paid.
export type StationaryRequestStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_pickup"
  | "completed"
  | "rejected";

export type MyStationaryRequest = {
  id: number;
  file_summary: string | null;
  total_pages: number;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize | null;
  sides: StationarySides | null;
  binding: StationaryBinding | null;
  amount: number;
  status: StationaryRequestStatus;
  rejection_reason: string | null;
  created_at: string;
};

export async function getMyStationaryRequests(): Promise<MyStationaryRequest[]> {
  const { data } = await apiClient.get<{ data: MyStationaryRequest[] }>("/me/stationary-requests");
  return data.data;
}
