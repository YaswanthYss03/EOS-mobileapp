import { apiClient } from "./client";

// Craveo — the campus canteen/food-court ordering feature. Backend:
// EOSbackend1/src/modules/canteen-ordering/*. Open to every role that has
// the Campus/Amenity tab, same "for all login" scope as the Stationery
// Store - no role restriction on any endpoint here.

export interface CraveoCategory {
  id: number;
  name: string;
}

export interface CraveoDish {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  parcel_available: boolean;
  category: CraveoCategory;
  created_at: string;
  updated_at: string;
}

export async function listCraveoDishes(params?: { category_id?: number; search?: string }): Promise<CraveoDish[]> {
  const { data } = await apiClient.get<{ data: CraveoDish[] }>("/me/canteen-ordering/dishes", { params });
  return data.data;
}

export async function listCraveoCategories(): Promise<CraveoCategory[]> {
  const { data } = await apiClient.get<{ data: CraveoCategory[] }>("/me/canteen-ordering/dish-categories");
  return data.data;
}

export interface CraveoSettings {
  gst_percentage: number;
  parcel_charge: number;
}

export async function getCraveoSettings(): Promise<CraveoSettings> {
  const { data } = await apiClient.get<{ data: CraveoSettings }>("/me/canteen-ordering/settings");
  return data.data;
}

export type CraveoOrderStatus = "pending" | "placed" | "accepted" | "preparing" | "ready" | "collected" | "cancelled";
export type CraveoPaymentMethod = "wallet" | "razorpay";
export type CraveoPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface CraveoOrderItem {
  name: string;
  quantity: number;
  is_parcel: boolean;
  price: number;
}

export interface CraveoOrder {
  id: number;
  status: CraveoOrderStatus;
  payment_method: CraveoPaymentMethod | null;
  payment_status: CraveoPaymentStatus | null;
  total_amount: number;
  pickup_token: string | null;
  created_at: string;
  items: CraveoOrderItem[];
}

export interface CraveoOrderCheckoutResult {
  order_id: number;
  pickup_token: string | null;
  status: string;
  subtotal: number;
  parcel_total: number;
  gst_percentage: number;
  gst_amount: number;
  total_amount: number;
  wallet_balance?: number;
}

export type CraveoCheckoutItem = { dish_id: number; quantity: number; is_parcel?: boolean };

/** POST /me/canteen-ordering/orders — synchronous, PIN-gated wallet checkout. */
export async function checkoutCraveoWithWallet(items: CraveoCheckoutItem[], pin: string): Promise<CraveoOrderCheckoutResult> {
  const { data } = await apiClient.post<{ data: CraveoOrderCheckoutResult }>("/me/canteen-ordering/orders", { items, pin });
  return data.data;
}

export interface CraveoRazorpayOrder {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

/** POST /me/canteen-ordering/checkout/razorpay-order — stages a Razorpay order. */
export async function createCraveoRazorpayOrder(items: CraveoCheckoutItem[]): Promise<CraveoRazorpayOrder> {
  const { data } = await apiClient.post<{ data: CraveoRazorpayOrder }>("/me/canteen-ordering/checkout/razorpay-order", { items });
  return data.data;
}

export type VerifyCraveoRazorpayPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/** POST /me/canteen-ordering/checkout/razorpay-verify — server re-verifies the signature. */
export async function verifyCraveoRazorpayPayment(payload: VerifyCraveoRazorpayPayload): Promise<CraveoOrderCheckoutResult> {
  const { data } = await apiClient.post<{ data: CraveoOrderCheckoutResult }>("/me/canteen-ordering/checkout/razorpay-verify", payload);
  return data.data;
}

/** GET /me/canteen-ordering/orders */
export async function listMyCraveoOrders(): Promise<CraveoOrder[]> {
  const { data } = await apiClient.get<{ data: CraveoOrder[] }>("/me/canteen-ordering/orders");
  return data.data;
}

/** GET /me/canteen-ordering/orders/:id */
export async function getMyCraveoOrder(id: number): Promise<CraveoOrder> {
  const { data } = await apiClient.get<{ data: CraveoOrder }>(`/me/canteen-ordering/orders/${id}`);
  return data.data;
}

/** POST /me/canteen-ordering/orders/:id/cancel */
export async function cancelMyCraveoOrder(id: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<{ data: { success: boolean } }>(`/me/canteen-ordering/orders/${id}/cancel`);
  return data.data;
}
