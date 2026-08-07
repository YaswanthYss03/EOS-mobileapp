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
