import { apiClient } from "./client";

// Principal-only institution-wide student directory - see EOS-backend's
// src/modules/principal-students/principal-students.service.ts. Attendance%,
// CGPA and fee status are all computed live from real records (no stored
// "student summary" table exists), so nulls are expected wherever a student
// has no attendance/exam/fee-demand rows yet - never fabricated.

export type FeeStatus = "paid" | "due" | "scholarship" | "no_demand";

export type PrincipalStudentRow = {
  id: number;
  student_id_no: string;
  register_no: string | null;
  name: string;
  department_code: string | null;
  department_name: string | null;
  semester: number | null;
  attendance_pct: number | null;
  cgpa: number | null;
  fee_status: FeeStatus;
  fee_outstanding: number;
};

export type PrincipalStudentsSearchResult = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  students: PrincipalStudentRow[];
};

export type PrincipalStudentsSearchParams = {
  search?: string;
  department_id?: number;
  year?: number;
  below_75?: boolean;
  fees_pending?: boolean;
  page?: number;
  limit?: number;
};

export type PrincipalAttendanceOverview = {
  present_today: number;
  mean_attendance_pct: number | null;
  below_75_count: number;
  departments: { code: string; name: string; attendance_pct: number | null }[];
};

export async function searchPrincipalStudents(
  params: PrincipalStudentsSearchParams,
): Promise<PrincipalStudentsSearchResult> {
  const { data } = await apiClient.get<{ data: PrincipalStudentsSearchResult }>("/principal-students", {
    params,
  });
  return data.data;
}

export async function getPrincipalStudentsRollCount(): Promise<number> {
  const { data } = await apiClient.get<{ data: { count: number } }>("/principal-students/roll-count");
  return data.data.count;
}

export async function getPrincipalAttendanceOverview(): Promise<PrincipalAttendanceOverview> {
  const { data } = await apiClient.get<{ data: PrincipalAttendanceOverview }>(
    "/principal-students/attendance-overview",
  );
  return data.data;
}
