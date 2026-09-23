import { apiClient } from "./client";
import type { InstitutionDirectoryFilters } from "./institution-directory.api";

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
  class_id: number | null;
  batch_name: string | null;
  course_code: string | null;
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

// `filters` is optional and combinable (search + Batch/Department/Class
// with Section) - omitting it keeps the original "every department at
// once" behavior this endpoint always had (see
// StudentEntrepreneurshipService.findAll).
export async function getAllEntrepreneurship(filters?: InstitutionDirectoryFilters): Promise<EntrepreneurshipEntry[]> {
  const { data } = await apiClient.get<{ data: EntrepreneurshipEntry[] }>("/student-entrepreneurship", {
    params: filters,
  });
  return data.data;
}

export type MentorEntrepreneurshipEntry = {
  id: number;
  student: { id: number; name: string; student_id_no: string; photo_url: string | null };
  business_name: string;
  business_description: string | null;
  sector: string | null;
  stage: string | null;
  // Normalized to a number server-side (unlike EntrepreneurshipEntry.funding_required
  // above, which is the raw Prisma Decimal-as-string from the principal-facing endpoint).
  funding_required: number | null;
  remarks: string | null;
  created_at: string;
};

// Class-mentor-scoped (see EOS-backend's class-mentors.service.ts) - every
// student in the caller's own mentored class who has registered a startup/
// business idea, not every student college-wide like getAllEntrepreneurship
// (Principal-only) above.
export async function getMentorClassEntrepreneurship(classId: number): Promise<MentorEntrepreneurshipEntry[]> {
  const { data } = await apiClient.get<{ data: MentorEntrepreneurshipEntry[] }>(
    `/me/mentee-classes/${classId}/entrepreneurship`,
  );
  return data.data;
}
