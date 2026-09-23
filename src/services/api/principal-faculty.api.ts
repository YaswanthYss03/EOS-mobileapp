import { apiClient } from "./client";

// Principal-only institution-wide faculty & staff overview - see
// EOS-backend's src/modules/principal-faculty/principal-faculty.service.ts.
// Everything is computed live from real attendance/appraisal/payroll
// records - kept fully separate from the Students directory.

export type PrincipalFacultyDepartment = {
  code: string;
  name: string;
  teaching: number;
  support: number;
  attendance_pct: number | null;
};

export type PrincipalFacultyOverview = {
  total_employees: number;
  teaching_count: number;
  non_teaching_count: number;
  present_today: number;
  on_duty_today: number;
  on_leave_today: number;
  appraisals_closed: number;
  appraisals_total: number;
  appraisal_academic_year: string | null;
  payroll_amount: number;
  payroll_month: number;
  payroll_year: number;
  payroll_disbursed_at: string | null;
  departments: PrincipalFacultyDepartment[];
};

export async function getPrincipalFacultyOverview(): Promise<PrincipalFacultyOverview> {
  const { data } = await apiClient.get<{ data: PrincipalFacultyOverview }>("/principal-faculty/overview");
  return data.data;
}

// Searchable/filterable faculty directory - GET /principal-faculty/coordination,
// already real per-faculty data (load/duties/mentees/status), just never
// exposed as a searchable list in the mobile app before (only the
// department-wise strength table from getOverview above was shown).
export type PrincipalFacultyCoordinationRow = {
  id: number;
  name: string;
  designation: string | null;
  department_code: string | null;
  department_name: string | null;
  photo_url: string | null;
  load_hrs: number;
  duties: number;
  mentees: number;
  status: "on_leave" | "on_duty" | "overloaded" | "available";
  next_duty: { date: string; session: string } | null;
};

export async function getPrincipalFacultyCoordination(params?: {
  department_id?: number;
  search?: string;
}): Promise<PrincipalFacultyCoordinationRow[]> {
  const { data } = await apiClient.get<{ data: PrincipalFacultyCoordinationRow[] }>(
    "/principal-faculty/coordination",
    { params },
  );
  return data.data;
}

// Full Faculty Profile detail screen - GET /principal-faculty/:id/profile,
// already comprehensive server-side - simply never called by the mobile
// app before.
export type PrincipalFacultyProfile = {
  id: number;
  staff_code: string | null;
  name: string;
  designation: string | null;
  department: { id: number; name: string; code: string } | null;
  photo_url: string | null;
  date_of_joining: string | null;
  experience_years: number | null;
  status: string;
  gender: string | null;
  date_of_birth: string | null;
  institute_email: string;
  personal_email: string | null;
  phone: string | null;
  qualification: string | null;
  specialization: string | null;
  previous_institution: string | null;
  office_room: string | null;
  work_location: string | null;
  employment_status: string | null;
  employment_type: string | null;
  attendance_pct_this_term: number | null;
  periods_per_week: number;
  class_advisor_of: string | null;
  subjects_handled: {
    code: string;
    name: string;
    semester: number | null;
    section: string;
    academic_year: string;
  }[];
  leave_balances: { leave_type: string; allocated: number; used: number; academic_year: string }[];
  leave_history: {
    from_date: string;
    to_date: string;
    reason: string | null;
    hod_status: string;
    hr_status: string;
    created_at: string;
  }[];
  od_history: {
    from_date: string;
    to_date: string;
    purpose: string | null;
    place: string | null;
    hod_status: string;
    hr_status: string;
  }[];
  appraisal: {
    status: string;
    academic_year: string | null;
    hod_reviewed_at: string | null;
    management_approved_at: string | null;
    remarks: string | null;
  } | null;
  publications: { title: string; type: string; year: number; citation_count: number }[];
  publications_summary: {
    total: number;
    journals: number;
    conferences: number;
    books: number;
    total_citations: number;
    h_index: number;
  };
  awards: { title: string; year: number; awarded_by: string | null }[];
  responsibilities: { title: string; academic_year: string }[];
};

export async function getPrincipalFacultyProfile(id: number): Promise<PrincipalFacultyProfile> {
  const { data } = await apiClient.get<{ data: PrincipalFacultyProfile }>(`/principal-faculty/${id}/profile`);
  return data.data;
}
