import { apiClient } from "./client";

// Mirrors EOS-backend's student-ods module (see
// EOSbackend1/src/modules/admissions/student-ods/student-ods.*.ts) - the
// Class Mentor's own review queue for GET /me/student-ods, and the mentor
// stage of the two-stage OD approval chain (mentor, then each team member's
// department HoD - out of scope on this screen). mentor_approval_status is
// one value per request (od_requests), not per team member - the mentor
// gate applies to the whole request, scoped by the TEAM CREATOR's class,
// not every member's class.

export type OdApprovalStatus = "pending" | "approved" | "rejected";

export type StudentOdRequest = {
  id: number;
  team_id: number;
  unique_code: string;
  member_count: number;
  creator: {
    id: number;
    student_id_no: string;
    name: string;
    section: string | null;
    department_name: string | null;
  };
  from_date: string;
  to_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string | null;
  faculty_guide_name: string | null;
  mentor_approval_status: OdApprovalStatus;
  created_at: string;
};

// Fetched once, unfiltered (limit generous enough for a single mentor's
// queue - PaginationDto caps it at 100) - the status pills in the UI filter
// this client-side, matching the sibling Student Leave screen's pattern.
export async function getStudentOdRequests(): Promise<StudentOdRequest[]> {
  const { data } = await apiClient.get<{ data: { data: StudentOdRequest[] } }>("/me/student-ods", {
    params: { page: 1, limit: 100 },
  });
  return data.data.data;
}

export async function facultyApproveOd(
  id: number,
  decision: "approved" | "rejected",
): Promise<StudentOdRequest> {
  const { data } = await apiClient.patch<{ data: StudentOdRequest }>(`/me/student-ods/${id}/faculty-approve`, {
    decision,
  });
  return data.data;
}
