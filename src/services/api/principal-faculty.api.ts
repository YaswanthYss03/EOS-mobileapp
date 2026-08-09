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
