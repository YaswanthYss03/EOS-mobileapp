import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/staff-attendance response (see
// EOS-backend/src/modules/faculty/attendance/me-staff-attendance.service.ts).
// Self-scoped to the calling faculty member. Each day's status is read from
// faculty_daily_attendance (the real punch/admin-marked record) when one
// exists for that date; otherwise it falls back to a best-effort derivation
// from the faculty's own approved leaves (faculty_leaves -> "absent") and
// opted-in holiday slots (holiday_slots -> "holiday"). A day with no data in
// any of those three sources has no entry in `marks` at all - "present" is
// never assumed.
export type StaffAttendanceDayStatus = "present" | "absent" | "onDuty" | "holiday";

export type StaffAttendanceStats = {
  present: number;
  absent: number;
  onDuty: number;
  overallPercent: number;
};

export type MyStaffAttendanceResponse = {
  year: number;
  month: number;
  stats: StaffAttendanceStats;
  marks: Record<string, StaffAttendanceDayStatus>;
};

export async function getMyStaffAttendance(
  year: number,
  month: number,
): Promise<MyStaffAttendanceResponse> {
  const { data } = await apiClient.get<{ data: MyStaffAttendanceResponse }>(
    "/me/staff-attendance",
    { params: { year, month } },
  );
  return data.data;
}

export type StaffAttendanceFaculty = {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
};

export type FacultyAttendanceSummary = {
  faculty: StaffAttendanceFaculty;
  year: number;
  month: number;
  stats: StaffAttendanceStats;
};

export type FacultyAttendanceDetail = MyStaffAttendanceResponse & {
  faculty: StaffAttendanceFaculty;
};

// GET /me/staff-attendance-review (HoD/HR Payroll only) - one row per active
// faculty member with that month's stats. Backs the HR attendance roster.
export async function listStaffAttendanceForReview(
  year: number,
  month: number,
): Promise<FacultyAttendanceSummary[]> {
  const { data } = await apiClient.get<{ data: FacultyAttendanceSummary[] }>(
    "/me/staff-attendance-review",
    { params: { year, month } },
  );
  return data.data;
}

// GET /me/staff-attendance/:facultyId (HoD/HR Payroll only) - same shape as
// getMyStaffAttendance but for a faculty member chosen by id. Backs the
// drill-down calendar from the roster.
export async function getStaffAttendanceForFaculty(
  facultyId: number,
  year: number,
  month: number,
): Promise<FacultyAttendanceDetail> {
  const { data } = await apiClient.get<{ data: FacultyAttendanceDetail }>(
    `/me/staff-attendance/${facultyId}`,
    { params: { year, month } },
  );
  return data.data;
}
