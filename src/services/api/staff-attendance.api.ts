import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/staff-attendance response (see
// EOS-backend/src/modules/faculty/attendance/me-staff-attendance.service.ts).
// Self-scoped to the calling faculty member. Each day's status is read from
// faculty_daily_attendance (the real punch/admin-marked record) when one
// exists for that date; otherwise it falls back to a best-effort derivation
// from the faculty's own approved leaves (faculty_leaves -> "absent") and
// opted-in holiday slots (holiday_slots -> "holiday"). Every remaining day
// defaults to "present".
export type StaffAttendanceDayStatus = "present" | "absent" | "onDuty" | "holiday";

export type MyStaffAttendanceResponse = {
  year: number;
  month: number;
  stats: {
    present: number;
    absent: number;
    onDuty: number;
    overallPercent: number;
  };
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
