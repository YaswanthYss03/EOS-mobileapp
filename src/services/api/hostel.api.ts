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

export type NightAttendanceStatus = "present" | "absent";

export type MyNightAttendanceRecord = {
  id: number;
  date: string;
  status: NightAttendanceStatus;
  marked_at: string;
  published_at: string | null;
};

export type MyNightAttendance = {
  is_hostel_resident: boolean;
  records: MyNightAttendanceRecord[];
};

// Reads the warden's own PUBLISHED night roll-call marks (see EOS-backend's
// night-attendance.service.ts for the warden side, and
// me-hostel-night-attendance.service.ts for this self-scoped read) - a draft
// mark the warden hasn't published yet never appears here. Pass from/to
// (e.g. a calendar month's first/last day) to scope the fetch, same
// convention as getMyAttendance - omit both for the last 90 records.
export async function getMyNightAttendance(from?: string, to?: string): Promise<MyNightAttendance> {
  const { data } = await apiClient.get<{ data: MyNightAttendance }>("/me/hostel-night-attendance", {
    params: from && to ? { from, to } : undefined,
  });
  return data.data;
}

// --- Warden-side review (not self-service - see EOS-backend's
// src/modules/hostel/leave-requests/leave-requests.*.ts). These are Hostel
// tab Leave requests only (student_leaves rows with routed_to_warden=true) -
// a completely different queue from the Warden's read-only
// from-academic-leave visibility, which this module doesn't cover.

export type HostelLeaveStatus = "pending" | "warden_approved" | "rejected";

export type HostelLeaveRequest = {
  id: number;
  student: {
    id: number;
    name: string;
    student_id_no: string;
    roll_no: string | null;
  };
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: HostelLeaveStatus;
  approved_by_warden: string | null;
  created_at: string;
  // True once any of the student's linked parents has acknowledged this
  // request on their own Progress tab's Acknowledge page.
  parent_acknowledged: boolean;
};

export type HostelLeaveRequestsResponse = {
  data: HostelLeaveRequest[];
  page: number;
  page_size: number;
  total: number;
};

export async function getHostelLeaveRequests(params?: {
  status?: HostelLeaveStatus;
  hostel_id?: number;
  page?: number;
  page_size?: number;
}): Promise<HostelLeaveRequestsResponse> {
  const { data } = await apiClient.get<{ data: HostelLeaveRequestsResponse }>("/hostel/leave-requests", {
    params,
  });
  return data.data;
}

export async function decideHostelLeaveRequest(
  id: number,
  decision: "approved" | "rejected",
): Promise<HostelLeaveRequest> {
  const { data } = await apiClient.patch<{ data: HostelLeaveRequest }>(`/hostel/leave-requests/${id}/decision`, {
    decision,
  });
  return data.data;
}
