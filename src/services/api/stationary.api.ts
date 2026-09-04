import { apiClient } from "./client";

// Mirrors EOS-backend's new stationary module (see
// EOSbackend1/src/modules/stationary/stationary.*.ts) - the print/xerox
// shop request payment gateway, same Razorpay order-then-verify shape as
// wallet top-up (see wallet.api.ts). `amount` is computed server-side from
// copies/color_mode - there's no per-document page count anywhere in this
// app to price against yet, so this is a flat placeholder rate until real
// page-count extraction exists.

export type StationaryOrientation = "portrait" | "landscape";
export type StationaryColorMode = "color" | "bw";
export type StationaryPages = "all" | "even" | "odd";

export type CreateStationaryOrderPayload = {
  file_name?: string;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  pages: StationaryPages;
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
