import { apiClient } from "./client";

// Principal-only Sports overview - see EOS-backend's
// src/modules/principal-sports/principal-sports.service.ts.

export type PrincipalSportsTeam = {
  id: number;
  name: string;
  coach_name: string | null;
  department_code: string | null;
  member_count: number;
};

export type PrincipalSportsOverview = {
  students_in_sports: number;
  equipment_issued: number;
  teams: PrincipalSportsTeam[];
};

export async function getPrincipalSportsOverview(): Promise<PrincipalSportsOverview> {
  const { data } = await apiClient.get<{ data: PrincipalSportsOverview }>("/principal-sports/overview");
  return data.data;
}
