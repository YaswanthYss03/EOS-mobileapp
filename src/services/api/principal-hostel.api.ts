import { apiClient } from "./client";

// Principal-only Hostel occupancy overview - see EOS-backend's
// src/modules/principal-hostel/principal-hostel.service.ts.

export type PrincipalHostelBlock = {
  id: number;
  name: string;
  wing: "boys" | "girls";
  warden_name: string | null;
  beds_sanctioned: number;
  occupied: number;
  vacant: number;
};

export type PrincipalHostelOverview = {
  block_count: number;
  beds_sanctioned: number;
  occupied: number;
  vacant: number;
  occupancy_pct: number | null;
  blocks: PrincipalHostelBlock[];
};

export async function getPrincipalHostelOverview(): Promise<PrincipalHostelOverview> {
  const { data } = await apiClient.get<{ data: PrincipalHostelOverview }>("/principal-hostel/overview");
  return data.data;
}
