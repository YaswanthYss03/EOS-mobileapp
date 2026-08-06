import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/attendance response (see
// EOS-backend/src/modules/admissions/students/me-profile/me-attendance.service.ts).
// Self-scoped to the calling student - `from`/`to` are required ISO date
// strings (YYYY-MM-DD), `subject_id` is optional. The backend only tracks
// "present"/"absent" per attendance_records row - there is no "on duty" or
// "holiday" status, and a date with no row simply means no record exists for
// that day (unmarked class, weekend, etc.), not that the student was present.
export type AttendanceStatus = "present" | "absent";

export type MyAttendanceSubjectBreakdown = {
  subject_id: number;
  subject_name: string;
  total: number;
  present: number;
  percentage: number;
};

export type MyAttendanceRecord = {
  attendance_date: string;
  subject_id: number | null;
  status: AttendanceStatus;
};

export type MyAttendanceResponse = {
  overall: {
    total_days: number;
    present: number;
    absent: number;
    percentage: number;
  };
  by_subject: MyAttendanceSubjectBreakdown[];
  records: MyAttendanceRecord[];
};

export async function getMyAttendance(
  from: string,
  to: string,
  subjectId?: number,
): Promise<MyAttendanceResponse> {
  const { data } = await apiClient.get<{ data: MyAttendanceResponse }>("/me/attendance", {
    params: {
      from,
      to,
      ...(subjectId !== undefined ? { subject_id: subjectId } : {}),
    },
  });
  return data.data;
}
