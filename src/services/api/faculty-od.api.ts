import { apiClient } from "./client";

// Mirrors EOS-backend's POST /me/create-od and GET /me/faculty-od (see
// EOS-backend/src/modules/faculty/faculty-od/faculty-od.service.ts).
// Self-scoped to the calling faculty member. There is no od_type column on
// faculty_od_requests and no OD-balance/quota concept anywhere in the
// schema. overall_status is computed server-side: "rejected" if either
// approval is rejected, "approved" only once both HoD and HR have approved,
// else "pending".
export type FacultyOdApprovalStatus = "pending" | "approved" | "rejected";

export type MyFacultyOd = {
  id: number;
  from_date: string;
  to_date: string;
  place: string | null;
  purpose: string | null;
  hod_approval_status: FacultyOdApprovalStatus;
  hr_approval_status: FacultyOdApprovalStatus;
  overall_status: FacultyOdApprovalStatus;
  created_at: string;
};

export type CreateFacultyOdPayload = {
  from_date: string;
  to_date: string;
  place?: string;
  purpose?: string;
};

export async function createFacultyOd(payload: CreateFacultyOdPayload): Promise<MyFacultyOd> {
  const { data } = await apiClient.post<{ data: MyFacultyOd }>("/me/create-od", payload);
  return data.data;
}

export async function listFacultyOd(): Promise<MyFacultyOd[]> {
  const { data } = await apiClient.get<{ data: { data: MyFacultyOd[] } }>("/me/faculty-od", {
    params: { limit: 100 },
  });
  return data.data.data;
}
