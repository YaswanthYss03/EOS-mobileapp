import { apiClient } from "./client";

// Mirrors EOS-backend's hostel self-service endpoints (see
// EOS-backend/src/modules/admissions/students/me-profile/{me-hostel-room,
// me-hostel-outings,me-hostel-complaints,me-mess-feedback}.service.ts). All
// self-scoped to the calling student via the JWT.

export type HostelRoomInfo = {
  is_hostel_resident: boolean;
  student_name: string;
  register_no: string | null;
  hostel_name: string | null;
  room_number: string | null;
  room_type_name: string | null;
  mess_type: string | null;
};

export async function getMyHostelRoom(): Promise<HostelRoomInfo> {
  const { data } = await apiClient.get<{ data: HostelRoomInfo }>("/me/hostel-room");
  return data.data;
}

export type OutingStatus = "pending" | "approved" | "rejected";

export type MyHostelOuting = {
  id: number;
  from_date: string;
  to_date: string;
  start_time: string;
  return_time: string | null;
  reason: string | null;
  status: OutingStatus;
  room_number: string | null;
};

export type CreateHostelOutingPayload = {
  from_date: string;
  to_date: string;
  start_time: string;
  return_time?: string;
  reason?: string;
};

export async function createMyHostelOuting(payload: CreateHostelOutingPayload): Promise<MyHostelOuting> {
  const { data } = await apiClient.post<{ data: MyHostelOuting }>("/me/hostel-outings", payload);
  return data.data;
}

// hostel_complaint_category_enum (see prisma/schema.prisma) - the app's
// category picker labels get mapped onto these real values.
export type HostelComplaintCategory =
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "network"
  | "mess"
  | "facilities"
  | "other";

export type MyHostelComplaint = {
  id: number;
  category: HostelComplaintCategory;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
};

export type CreateHostelComplaintPayload = {
  category: HostelComplaintCategory;
  title: string;
  description?: string;
};

export async function createMyHostelComplaint(
  payload: CreateHostelComplaintPayload,
): Promise<MyHostelComplaint> {
  const { data } = await apiClient.post<{ data: MyHostelComplaint }>("/me/hostel-complaints", payload);
  return data.data;
}

export type MyMessFeedback = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type CreateMessFeedbackPayload = {
  rating: number;
  comment?: string;
};

export async function createMyMessFeedback(payload: CreateMessFeedbackPayload): Promise<MyMessFeedback> {
  const { data } = await apiClient.post<{ data: MyMessFeedback }>("/me/mess-feedback", payload);
  return data.data;
}
