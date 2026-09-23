import { apiClient } from "./client";

// Mirrors EOS-backend's HoD-facing department-wide attendance endpoints
// (see EOS-backend/src/modules/hod/hod-class-records.service.ts). Every
// figure here is computed live from real attendance_records rows, grouped
// by class - there is no stored "attendance %" column anywhere.

export type HodAttendanceClassSummary = {
  class_id: number;
  section: string;
  year: string;
  semester: number;
  student_count: number;
  mean_attendance: number | null;
};

export async function getDepartmentAttendanceOverview(): Promise<HodAttendanceClassSummary[]> {
  const { data } = await apiClient.get<{ data: HodAttendanceClassSummary[] }>("/hod/attendance-overview");
  return data.data;
}

export type HodClassStudentAttendance = {
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  attendance_percent: number | null;
};

export type HodClassAttendanceDetail = {
  class: {
    class_id: number;
    section: string;
    semester: number | null;
    year: string | null;
    department_name: string;
    department_code: string;
    classroom: string | null;
    student_count: number;
  };
  stats: { mean_attendance: number | null } | null;
  students: HodClassStudentAttendance[];
};

// Reuses the existing GET /hod/class-records/:classId endpoint (already
// computes attendance_percent per student) - this screen just reads the
// attendance-relevant fields off the same real response, ignoring the
// GPA/CGPA/fees/placement fields that endpoint also returns for the
// (separate, not-yet-built) Subject Records screen.
export async function getDepartmentClassAttendance(classId: number): Promise<HodClassAttendanceDetail> {
  const { data } = await apiClient.get<{ data: HodClassAttendanceDetail }>(`/hod/class-records/${classId}`);
  return data.data;
}
