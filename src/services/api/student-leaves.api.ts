import { apiClient } from "./client";

// Mirrors EOS-backend's student-leaves module (see
// EOSbackend1/src/modules/admissions/student-leaves/student-leaves.*.ts) -
// the Class Mentor's own review queue for GET /me/student-leaves, and the
// two-stage approval chain (Faculty then HoD). There is no bare "approved"
// status - a Class Mentor's "approve" moves a request to faculty_approved
// (awaiting the HoD's separate, final hod-approve), not to a terminal state.
// This module only covers the faculty (mentor) side; the HoD's own
// hod-approve endpoint is out of scope here.

export type StudentLeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected";

export type StudentLeaveRequest = {
  id: number;
  student_id: number;
  student: {
    id: number;
    student_id_no: string;
    name: string;
    section: string | null;
    department_name: string | null;
  };
  from_date: string;
  to_date: string;
  reason: string | null;
  status: StudentLeaveStatus;
  approved_by_faculty_id: number | null;
  approved_by_hod_user_id: number | null;
  created_at: string;
};

// Fetched once, unfiltered (limit generous enough for a single mentor's
// queue - PaginationDto caps it at 100) - the status pills in the UI filter
// this client-side, since the backend's own `status` query param only
// accepts one exact enum value, not an OR across faculty_approved/
// hod_approved for an "Approved" pill.
export async function getStudentLeaveRequests(): Promise<StudentLeaveRequest[]> {
  const { data } = await apiClient.get<{ data: { data: StudentLeaveRequest[] } }>("/me/student-leaves", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

export async function facultyApproveLeave(
  id: number,
  decision: "approved" | "rejected",
): Promise<StudentLeaveRequest> {
  const { data } = await apiClient.patch<{ data: StudentLeaveRequest }>(`/me/student-leaves/${id}/faculty-approve`, {
    decision,
  });
  return data.data;
}
