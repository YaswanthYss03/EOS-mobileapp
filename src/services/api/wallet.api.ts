import { apiClient } from "./client";

// Mirrors EOS-backend's wallet module - see
// EOSbackend1/src/modules/wallet/{wallet.service,wallet.controller}.ts.
// Self-scoped to the caller's own wallet (auto-provisioned server-side on
// first touch) - there is no "view someone else's wallet" endpoint.
// Restricted server-side (@Roles) to Student/Faculty/HoD only.

export type WalletInfo = {
  balance: number;
  qr_token: string;
  pin_set: boolean;
};

export type WalletTransactionType = "credit" | "debit";
export type WalletTransactionSource = "cash" | "razorpay" | "adjustment" | "purchase" | "transfer";
export type WalletTransactionStatus = "pending" | "success" | "failed";

export type WalletTransaction = {
  id: number;
  txn_type: WalletTransactionType;
  source: WalletTransactionSource;
  amount: number;
  status: WalletTransactionStatus;
  remarks: string | null;
  created_at: string;
  outlet: { name: string; outlet_type: string } | null;
  counterparty_email: string | null;
};

export type WalletTransactionsResponse = {
  data: WalletTransaction[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function getWallet(): Promise<WalletInfo> {
  const { data } = await apiClient.get<{ data: WalletInfo }>("/me/wallet");
  return data.data;
}

export async function getWalletTransactions(page = 1, limit = 20): Promise<WalletTransactionsResponse> {
  const { data } = await apiClient.get<{ data: WalletTransactionsResponse }>("/me/wallet/transactions", {
    params: { page, limit },
  });
  return data.data;
}

export async function setWalletPin(pin: string): Promise<void> {
  await apiClient.post("/me/wallet/pin", { pin });
}

export async function changeWalletPin(currentPin: string, newPin: string): Promise<void> {
  await apiClient.patch("/me/wallet/pin", { current_pin: currentPin, new_pin: newPin });
}

export async function resolveWalletQrToken(qrToken: string): Promise<{ email: string }> {
  const { data } = await apiClient.get<{ data: { email: string } }>(
    `/me/wallet/resolve/${encodeURIComponent(qrToken)}`,
  );
  return data.data;
}

export async function transferWalletFunds(
  qrToken: string,
  amount: number,
  pin: string,
): Promise<{ balance: number; transaction_id: number }> {
  const { data } = await apiClient.post<{ data: { balance: number; transaction_id: number } }>(
    "/me/wallet/transfer",
    { qr_token: qrToken, amount, pin },
  );
  return data.data;
}

export async function createWalletTopupOrder(
  amount: number,
): Promise<{ order_id: string; amount: number; currency: string; key_id: string }> {
  const { data } = await apiClient.post<{
    data: { order_id: string; amount: number; currency: string; key_id: string };
  }>("/me/wallet/topup/order", { amount });
  return data.data;
}

export async function verifyWalletTopup(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ balance: number }> {
  const { data } = await apiClient.post<{ data: { balance: number } }>("/me/wallet/topup/verify", payload);
  return data.data;
}
