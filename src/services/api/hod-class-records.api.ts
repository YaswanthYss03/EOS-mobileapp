import { apiClient } from "./client";

// Mirrors EOS-backend's HoD-facing department-wide class roster endpoints
// (see EOS-backend/src/modules/hod/hod-class-records.service.ts). Every
// figure is computed live from real attendance_records/exam_marks/
// student_drive_applications/student_fee_demand_mapping - there is no
// stored "GPA"/"attendance %" column anywhere.

export type HodClassSummary = {
  class_id: number;
  section: string;
  year: string;
  semester: number;
  student_count: number;
  batch_id: number;
  batch_name: string;
};

export async function getDepartmentClasses(): Promise<HodClassSummary[]> {
  const { data } = await apiClient.get<{ data: HodClassSummary[] }>("/hod/class-records/classes");
  return data.data;
}

export type HodClassStudentRecord = {
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  class_label: string;
  gpa: number | null;
  cgpa: number | null;
  arrears: number;
  attendance_percent: number | null;
  fee_status: "paid" | "pending";
  fee_due: number;
  is_placed: boolean;
  at_risk: boolean;
  flags: { label: string; tone: "red" | "amber" | "green" | "grey" }[];
};

export type HodClassDetail = {
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
  advisor: {
    name: string;
    designation: string;
    department_code: string;
    phone: string | null;
    email: string | null;
  } | null;
  stats: {
    mean_attendance: number | null;
    average_cgpa: number | null;
    placed_count: number;
    eligible_count: number;
    fees_pending_count: number;
    student_count: number;
  } | null;
  students: HodClassStudentRecord[];
};

export async function getDepartmentClassDetail(classId: number): Promise<HodClassDetail> {
  const { data } = await apiClient.get<{ data: HodClassDetail }>(`/hod/class-records/${classId}`);
  return data.data;
}
