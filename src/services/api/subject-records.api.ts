import { apiClient } from "./client";

// Mirrors EOS-backend's faculty "Subject Records" endpoints (see
// EOS-backend/src/modules/faculty/subject-records/subject-records.service.ts).
// Self-scoped to the calling faculty via /me/subject-records - grade
// distribution and toppers are computed live from exam_marks, there is no
// stored letter-grade column.
export type SubjectRecordClass = {
  id: number;
  label: string;
};

export type SubjectRecordSubject = {
  id: number;
  name: string;
  subject_code: string;
};

export type SubjectRecordExam = {
  id: number;
  type: string;
  academic_year: string;
  semester: number;
};

export type SubjectRecordMapping = {
  exam_subject_mapping_id: number;
  class: SubjectRecordClass;
  subject: SubjectRecordSubject;
  exam: SubjectRecordExam;
  is_published: boolean;
  published_at: string | null;
  entered_count: number;
};

// class.label has no separately-exposed batch/section fields - only this
// composed string, built server-side as `${courses.code}-${section}
// (${batches.name})` (see EOS-backend's subject-records.service.ts's own
// classLabel()). Parsed back apart here purely for client-side filtering
// (Batch/Section dropdowns) - if that server-side format ever changes this
// degrades to showing the raw label as both "batch" and "section" rather
// than throwing.
export function parseClassLabel(label: string): { batchName: string; section: string } {
  const match = label.match(/^.+-([^\s()-]+)\s*\((.+)\)$/);
  if (!match) return { batchName: label, section: label };
  return { section: match[1], batchName: match[2] };
}

export type GradeCount = {
  grade: string;
  count: number;
};

export type Topper = {
  rank: number;
  name: string;
  roll_no: string;
  score: number;
};

export type SubjectRecordDetail = SubjectRecordMapping & {
  total_students: number;
  grade_distribution: GradeCount[];
  toppers: Topper[];
};

export async function getMySubjectRecordMappings(): Promise<SubjectRecordMapping[]> {
  const { data } = await apiClient.get<{ data: SubjectRecordMapping[] }>(
    "/me/subject-records",
  );
  return data.data;
}

export async function getMySubjectRecordDetail(
  examSubjectMappingId: number,
): Promise<SubjectRecordDetail> {
  const { data } = await apiClient.get<{ data: SubjectRecordDetail }>(
    `/me/subject-records/${examSubjectMappingId}`,
  );
  return data.data;
}

export async function publishSubjectRecordResult(
  examSubjectMappingId: number,
): Promise<SubjectRecordMapping> {
  const { data } = await apiClient.post<{ data: SubjectRecordMapping }>(
    `/me/subject-records/${examSubjectMappingId}/publish`,
  );
  return data.data;
}
