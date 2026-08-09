import { apiClient } from "./client";

// Principal-only read view of students who've registered a startup/
// business idea - see EOS-backend's
// src/modules/student-entrepreneurship/student-entrepreneurship.service.ts.
// At most one row per student (student_id is unique on the real table).

export type EntrepreneurshipStudent = {
  id: number;
  student_id_no: string;
  name: string;
  section: string | null;
  department: { code: string; name: string } | null;
};

export type EntrepreneurshipEntry = {
  id: number;
  business_name: string;
  business_description: string | null;
  sector: string | null;
  stage: string | null;
  // Prisma serializes Decimal as a numeric string over JSON - never
  // rounded/parsed here, just displayed as-is.
  funding_required: string | null;
  remarks: string | null;
  created_at: string;
  student: EntrepreneurshipStudent;
};

export async function getAllEntrepreneurship(): Promise<EntrepreneurshipEntry[]> {
  const { data } = await apiClient.get<{ data: EntrepreneurshipEntry[] }>("/student-entrepreneurship");
  return data.data;
}
