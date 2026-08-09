import { apiClient } from "./client";

// Principal-only Placements season overview - see EOS-backend's
// src/modules/principal-placements/principal-placements.service.ts. Sits
// above the existing "pick a department, see upcoming drives / history"
// flow, not a replacement for it. There's no "internship" concept anywhere
// in the schema, so unlike the reference design's "Internships" card, this
// shows real students-placed instead of inventing a conversion figure.

export type PrincipalPlacementsDepartment = {
  code: string;
  name: string;
  placement_pct: number | null;
};

export type PrincipalPlacementsOverview = {
  season_year: number;
  companies: number;
  offers_released: number;
  placement_pct: number | null;
  placement_pct_delta: number | null;
  highest_package: number | null;
  highest_package_role: string | null;
  average_package: number | null;
  students_placed: number;
  applicants: number;
  departments: PrincipalPlacementsDepartment[];
};

export async function getPrincipalPlacementsOverview(): Promise<PrincipalPlacementsOverview> {
  const { data } = await apiClient.get<{ data: PrincipalPlacementsOverview }>("/principal-placements/overview");
  return data.data;
}
