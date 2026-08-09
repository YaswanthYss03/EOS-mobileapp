import { apiClient } from "./client";

// Principal-only exams & results overview - see EOS-backend's
// src/modules/principal-exams/principal-exams.service.ts. "Arrear" = a
// (student, subject) pair with no passing attempt across any
// results_published exam - there's no stored arrears table. Pass
// percentage is scoped to the most recently held exam semester so the
// "vs last sem" delta compares like with like.

export type PrincipalExamsDepartment = {
  code: string;
  name: string;
  pass_pct: number | null;
  arrear_papers: number;
  topper_cgpa: number | null;
};

export type PrincipalExamsOverview = {
  pass_percentage: number | null;
  pass_percentage_delta: number | null;
  current_semester: number | null;
  students_with_arrears: number;
  arrear_papers: number;
  high_cgpa_count: number;
  high_cgpa_pct: number | null;
  revaluation_total: number;
  revaluation_pending: number;
  departments: PrincipalExamsDepartment[];
};

export async function getPrincipalExamsOverview(): Promise<PrincipalExamsOverview> {
  const { data } = await apiClient.get<{ data: PrincipalExamsOverview }>("/principal-exams/overview");
  return data.data;
}
