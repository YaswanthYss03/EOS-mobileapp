import { apiClient } from "./client";

// Mirrors EOS-backend's stationary module (EOSbackend1/src/modules/stationary): the print/xerox shop request
// flow - create the request, attach the document, then pay it from the requester's own wallet with their wallet
// PIN. The price is worked out on the server (PRICE_PER_PAGE per printed page) and never trusted from the
// client; the figure here is only an estimate to show before paying.

export type StationaryOrientation = "portrait" | "landscape";
export type StationaryColorMode = "color" | "bw";
export type StationaryPaperSize = "A4" | "A3" | "A5" | "Letter" | "Legal";
export type StationarySides = "Single-sided" | "Double-sided";
export type StationaryBinding = "No binding" | "Spiral binding" | "Calico binding";

export const PAPER_SIZES: StationaryPaperSize[] = ["A4", "A3", "A5", "Letter", "Legal"];
export const SIDES: StationarySides[] = ["Single-sided", "Double-sided"];
export const BINDINGS: StationaryBinding[] = ["No binding", "Spiral binding", "Calico binding"];

/** What the server charges for each printed page (pages x copies). Shown as an estimate; the server decides. */
export const PRICE_PER_PAGE = 2;

/** The body the server accepts for a new request - it refuses anything else (unknown or missing fields). */
export type CreateStationaryOrderPayload = {
  /** A short description of the request: the file's name. */
  file_summary?: string;
  total_pages: number;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize;
  sides: StationarySides;
  binding: StationaryBinding;
};

export type StationaryRequestCreated = {
  /** The request to attach the document to and then pay. */
  request_id: number;
  /** What the server will charge. */
  amount: number;
};

/** Saves the request, unpaid, ready to be paid from the wallet. Nothing is charged here. */
export async function createStationaryRequest(payload: CreateStationaryOrderPayload): Promise<StationaryRequestCreated> {
  const { data } = await apiClient.post<{ data: StationaryRequestCreated }>("/me/stationary-requests/wallet", payload);
  return data.data;
}

/** Sends the document to the print shop for a request. Multipart; one file per request. */
export async function uploadStationaryFile(requestId: number, file: { uri: string; name: string; mimeType: string | null }): Promise<void> {
  const formData = new FormData();
  // React Native's FormData takes { uri, name, type } for a file part - this is not a real Blob, so the DOM
  // FormData typings do not apply (same as hr-queries.api.ts).
  formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob);
  await apiClient.post(`/me/stationary-requests/${requestId}/file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export type StationaryPaymentResult = {
  id: number;
  amount: number;
  status: "paid";
  /** What is left in the wallet. */
  balance: number;
};

/**
 * Pays the request from the caller's own wallet. The server checks the 4-digit wallet PIN (a wrong one is
 * counted, and too many lock the wallet for a while) and that the balance covers it.
 */
export async function payStationaryRequestWithWallet(requestId: number, pin: string): Promise<StationaryPaymentResult> {
  const { data } = await apiClient.post<{ data: StationaryPaymentResult }>(`/me/stationary-requests/${requestId}/pay/wallet`, { pin });
  return data.data;
}

/** The server's own code for why a call was refused (WRONG_PIN, PIN_LOCKED, INSUFFICIENT_BALANCE, ...), if it sent one. */
export function apiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { errorCode?: unknown } } })?.response?.data?.errorCode;
  return typeof code === "string" ? code : null;
}

export type StationaryRequestStatus = "pending_payment" | "paid" | "processing" | "ready_for_pickup" | "completed" | "rejected";

export type MyStationaryRequest = {
  id: number;
  file_summary: string | null;
  total_pages: number | null;
  copies: number;
  orientation: StationaryOrientation;
  color_mode: StationaryColorMode;
  paper_size: StationaryPaperSize | null;
  sides: StationarySides | null;
  binding: StationaryBinding | null;
  has_file: boolean;
  file_original_name: string | null;
  /** How it was paid: "wallet" for a request paid from the wallet. */
  payment_mode: string | null;
  amount: number;
  status: StationaryRequestStatus;
  rejection_reason: string | null;
  created_at: string;
};

/** The caller's own print requests, newest first. */
export async function listMyStationaryRequests(): Promise<MyStationaryRequest[]> {
  const { data } = await apiClient.get<{ data: MyStationaryRequest[] }>("/me/stationary-requests");
  return data.data;
}
