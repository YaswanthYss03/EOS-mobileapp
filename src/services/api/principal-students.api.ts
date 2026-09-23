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
  class_id: number | null;
  section: string | null;
  batch_name: string | null;
  course_code: string | null;
  photo_url: string | null;
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

// Full Student Profile detail screen - GET /principal-students/:id/profile,
// already comprehensive server-side (see PrincipalStudentsService's own
// doc comment) - this was simply never called by the mobile app before,
// which only ever showed the shallow Attendance/CGPA/Fees list-row data.
export type PrincipalStudentFamilyMember = {
  name: string | null;
  qualification?: string | null;
  occupation?: string | null;
  annual_income?: number | null;
  email: string | null;
  mobile: string | null;
  photo_url?: string | null;
  relationship?: string | null;
  is_father?: boolean;
};

export type PrincipalStudentProfile = {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  status: string;
  admission_no: string | null;
  admission_date: string | null;
  admission_type: string | null;
  admission_quota: string | null;
  department: { id: number; name: string; code: string } | null;
  programme: string | null;
  batch: string | null;
  section: string | null;
  semester: number | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  mother_tongue: string | null;
  community: string | null;
  nationality: string | null;
  religion: string | null;
  caste: string | null;
  is_first_graduate: boolean;
  is_diff_abled: boolean;
  diff_abled_info: string | null;
  photo_url: string | null;
  institute_email: string;
  personal_email: string | null;
  alternate_email: string | null;
  mobile: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  passport_number: string | null;
  addresses: {
    type: string | null;
    line: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    district: string | null;
  }[];
  class_advisor: string | null;
  faculty_mentor: string | null;
  identity_marks: { number: string | null; description: string | null }[];
  family: {
    father: PrincipalStudentFamilyMember;
    mother: PrincipalStudentFamilyMember;
    guardian: PrincipalStudentFamilyMember;
  } | null;
  pre_admission: {
    cutoff_physics: number | null;
    cutoff_chemistry: number | null;
    cutoff_maths: number | null;
  } | null;
  gpa_history: { semester: number; gpa: number | null; credits: number; arrears: number }[];
  overall_gpa: number | null;
  overall_percentage: number | null;
  current_semester_subjects: {
    name: string;
    code: string;
    internal: number | null;
    external: number | null;
    total: number;
    grade: string;
  }[];
  monthly_attendance: { month: string; pct: number }[];
  overall_attendance_pct: number | null;
  documents: { name: string; available: boolean; file_url: string | null; verified_at: string | null }[];
  scholarships: { scheme: string; amount: number; awarded_at: string | null }[];
  hostel: { room_id: number; allocated_date: string | null; room_number: string | null; block: string | null } | null;
  transport: { route_id: number } | null;
  meeting_notes: { date: string; note: string | null }[];
  library: { books_issued: number };
  fee_ledger: {
    name: string;
    academic_year: string | null;
    semester: number | null;
    total_amount: number;
    paid_amount: number;
    status: "paid" | "partial" | "pending";
  }[];
  fees: { total_demand: number; total_paid: number; status: FeeStatus };
  achievements: { label: string; date: string | null; source: "sports" | "test_score" }[];
  discipline: { incident_count: number };
  placement: {
    company: string;
    status: string;
    offer_response: string | null;
    offered_package: number | null;
  }[];
};

export async function getPrincipalStudentProfile(id: number): Promise<PrincipalStudentProfile> {
  const { data } = await apiClient.get<{ data: PrincipalStudentProfile }>(`/principal-students/${id}/profile`);
  return data.data;
}
