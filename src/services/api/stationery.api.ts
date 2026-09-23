import { apiClient } from "./client";

// Mirrors EOS-backend's new Stationery Store module (see
// EOSbackend1/src/modules/stationery/*) - a shopping-cart e-commerce
// module, distinct from the pre-existing Xerox/print-shop self-service at
// stationary.api.ts (unlucky name collision, deliberate-adjacent feature).
// Open to every role - no role restriction on any endpoint here.

export type StationeryCategory = "study" | "food" | "care" | "hostel" | "college";

export type StationeryProduct = {
  id: number;
  category: StationeryCategory;
  name: string;
  description: string | null;
  specs: string[];
  price: number;
  original_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
};

export async function listStationeryProducts(params?: {
  category?: StationeryCategory;
  search?: string;
}): Promise<StationeryProduct[]> {
  const { data } = await apiClient.get<{ data: StationeryProduct[] }>("/stationery/products", { params });
  return data.data;
}

export async function getStationeryProduct(id: number): Promise<StationeryProduct> {
  const { data } = await apiClient.get<{ data: StationeryProduct }>(`/stationery/products/${id}`);
  return data.data;
}

export type StationeryCheckoutItem = { product_id: number; quantity: number };

export type StationeryOrderStatus = "pending" | "confirmed" | "preparing" | "ready_for_pickup" | "collected" | "cancelled";
export type StationeryPaymentMethod = "wallet" | "razorpay";
export type StationeryPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type StationeryOrderItem = {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

export type StationeryOrder = {
  id: number;
  status: StationeryOrderStatus;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  payment_method: StationeryPaymentMethod;
  payment_status: StationeryPaymentStatus;
  pickup_token: string | null;
  cancel_reason: string | null;
  created_at: string;
  confirmed_at: string | null;
  ready_at: string | null;
  collected_at: string | null;
  cancelled_at: string | null;
  stationery_order_items: StationeryOrderItem[];
};

/** POST /me/stationery/checkout/wallet - synchronous, PIN-gated. */
export async function checkoutStationeryWithWallet(
  items: StationeryCheckoutItem[],
  pin: string,
): Promise<StationeryOrder> {
  const { data } = await apiClient.post<{ data: StationeryOrder }>("/me/stationery/checkout/wallet", {
    items,
    pin,
  });
  return data.data;
}

export type StationeryRazorpayOrder = {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
};

/** POST /me/stationery/checkout/razorpay-order - stages a Razorpay order. */
export async function createStationeryRazorpayOrder(
  items: StationeryCheckoutItem[],
): Promise<StationeryRazorpayOrder> {
  const { data } = await apiClient.post<{ data: StationeryRazorpayOrder }>(
    "/me/stationery/checkout/razorpay-order",
    { items },
  );
  return data.data;
}

export type VerifyStationeryRazorpayPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/** POST /me/stationery/checkout/razorpay-verify - server re-verifies the signature. */
export async function verifyStationeryRazorpayPayment(
  payload: VerifyStationeryRazorpayPayload,
): Promise<StationeryOrder> {
  const { data } = await apiClient.post<{ data: StationeryOrder }>(
    "/me/stationery/checkout/razorpay-verify",
    payload,
  );
  return data.data;
}

/** GET /me/stationery/orders */
export async function listMyStationeryOrders(): Promise<StationeryOrder[]> {
  const { data } = await apiClient.get<{ data: StationeryOrder[] }>("/me/stationery/orders");
  return data.data;
}

/** GET /me/stationery/orders/:id */
export async function getMyStationeryOrder(id: number): Promise<StationeryOrder> {
  const { data } = await apiClient.get<{ data: StationeryOrder }>(`/me/stationery/orders/${id}`);
  return data.data;
}
