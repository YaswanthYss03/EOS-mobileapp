import { apiClient } from "./client";

// Principal-only Medical center overview - see EOS-backend's
// src/modules/principal-medical/principal-medical.service.ts. Scoped to
// this month's visits, grouped by their real recorded reason text (no
// invented categorization - exact-match grouping only).

export type PrincipalMedicalReason = {
  reason: string;
  visit_count: number;
};

export type PrincipalMedicalOverview = {
  students_visited: number;
  faculty_visited: number;
  reasons: PrincipalMedicalReason[];
};

export async function getPrincipalMedicalOverview(): Promise<PrincipalMedicalOverview> {
  const { data } = await apiClient.get<{ data: PrincipalMedicalOverview }>("/principal-medical/overview");
  return data.data;
}
