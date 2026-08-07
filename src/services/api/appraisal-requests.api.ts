import { apiClient } from "./client";

// Mirrors EOS-backend's GET /me/appraisal-criteria, POST /me/appraisal_requests
// and GET /me/appraisal_requests (see
// EOS-backend/src/modules/faculty/appraisal/appraisal.service.ts).
// Self-scoped to the calling faculty member. Appraisals are criteria-driven:
// a request is a header (academic_year) plus one entry per criterion the
// faculty member fills in (a single free-text description - there is no
// multi-field structure per entry). A faculty member may only have ONE
// request per academic_year (the backend 409s on a duplicate). Scoring is
// per-criterion (variable max_score, not a fixed /100) and is only ever set
// by HR later - never at submission.
export type AppraisalStatus = "submitted" | "hod_reviewed" | "hr_scored" | "management_approved" | "rejected";

export type AppraisalCriterion = {
  id: number;
  name: string;
  max_score: number;
};

export type AppraisalDivision = {
  id: number;
  name: string;
  criteria: AppraisalCriterion[];
};

export type AppraisalCriteriaResponse = {
  academic_year: string | null;
  divisions: AppraisalDivision[];
};

export type AppraisalEntry = {
  id: number;
  description: string | null;
  score: number | null;
  criteria: {
    id: number;
    name: string;
    max_score: number;
    division: { id: number; name: string };
  };
};

// Attachments belong to the division as a whole (not a specific criterion/
// entry) - stored in a Supabase Storage bucket, only the resulting URL is
// persisted server-side.
export type AppraisalAttachment = {
  id: number;
  division_id: number;
  file_url: string;
  file_name: string;
  uploaded_at: string;
};

// Always present on the wire (see AppraisalService.toResponse) - the
// faculty's own Apply/History screen just has no reason to render it
// (it's the caller's own name), but the HoD review queue needs it to show
// who each request belongs to.
export type AppraisalRequestFaculty = {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
  department_name: string;
};

export type MyAppraisalRequest = {
  id: number;
  academic_year: string;
  status: AppraisalStatus;
  created_at: string;
  faculty: AppraisalRequestFaculty;
  entries: AppraisalEntry[];
  attachments: AppraisalAttachment[];
  // Always present in the real response, but only rendered by
  // AppraisalRequestScreen's History tab for HR Payroll - who sees every
  // faculty member's applications (unscoped), not just their own - so it
  // needs to show whose request each row is.
  faculty: { id: number; first_name: string; last_name: string; designation: string };
};

type RawAppraisalCriteriaResponse = {
  academic_year: string | null;
  divisions: Array<{ id: number; name: string; criteria: Array<{ id: number; name: string; max_score: string | number }> }>;
};

type RawAppraisalRequest = Omit<MyAppraisalRequest, "entries"> & {
  entries: Array<
    Omit<AppraisalEntry, "score" | "criteria"> & {
      score: string | number | null;
      criteria: Omit<AppraisalEntry["criteria"], "max_score"> & { max_score: string | number };
    }
  >;
};

function normalizeCriteria(raw: RawAppraisalCriteriaResponse): AppraisalCriteriaResponse {
  return {
    academic_year: raw.academic_year,
    divisions: raw.divisions.map((division) => ({
      id: division.id,
      name: division.name,
      criteria: division.criteria.map((c) => ({ id: c.id, name: c.name, max_score: Number(c.max_score) })),
    })),
  };
}

function normalizeRequest(raw: RawAppraisalRequest): MyAppraisalRequest {
  return {
    id: raw.id,
    academic_year: raw.academic_year,
    status: raw.status,
    created_at: raw.created_at,
    faculty: raw.faculty,
    entries: raw.entries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      score: entry.score === null ? null : Number(entry.score),
      criteria: {
        id: entry.criteria.id,
        name: entry.criteria.name,
        max_score: Number(entry.criteria.max_score),
        division: entry.criteria.division,
      },
    })),
    attachments: raw.attachments,
    faculty: raw.faculty,
  };
}

export async function getAppraisalCriteria(academicYear?: string): Promise<AppraisalCriteriaResponse> {
  const { data } = await apiClient.get<{ data: RawAppraisalCriteriaResponse }>("/me/appraisal-criteria", {
    params: academicYear ? { academic_year: academicYear } : undefined,
  });
  return normalizeCriteria(data.data);
}

export type CreateAppraisalPayload = {
  academic_year: string;
  entries: Array<{ criteria_id: number; description?: string }>;
};

export async function createAppraisalRequest(payload: CreateAppraisalPayload): Promise<MyAppraisalRequest> {
  const { data } = await apiClient.post<{ data: RawAppraisalRequest }>("/me/appraisal_requests", payload);
  return normalizeRequest(data.data);
}

export async function listMyAppraisalRequests(): Promise<MyAppraisalRequest[]> {
  const { data } = await apiClient.get<{ data: { data: RawAppraisalRequest[] } }>("/me/appraisal_requests", {
    params: { limit: 100 },
  });
  return data.data.data.map(normalizeRequest);
}

// A file picked via expo-document-picker, staged locally before it's
// actually uploaded (only sent to the backend once the appraisal request
// this division belongs to has been created).
export type PickedAppraisalFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

export async function uploadAppraisalAttachments(
  requestId: number,
  divisionId: number,
  files: PickedAppraisalFile[],
): Promise<MyAppraisalRequest> {
  const formData = new FormData();
  formData.append("division_id", String(divisionId));
  for (const file of files) {
    formData.append(
      "files",
      // React Native's FormData accepts this {uri,name,type} shape directly.
      { uri: file.uri, name: file.name, type: file.mimeType || "application/octet-stream" } as unknown as Blob,
    );
  }

  const { data } = await apiClient.post<{ data: RawAppraisalRequest }>(
    `/me/appraisal_requests/${requestId}/attachments`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return normalizeRequest(data.data);
}

export async function deleteAppraisalAttachment(requestId: number, attachmentId: number): Promise<void> {
  await apiClient.delete(`/me/appraisal_requests/${requestId}/attachments/${attachmentId}`);
}

// ───────────────────────────── HoD review queue ─────────────────────────────
// Same GET /me/appraisal_requests endpoint the faculty Apply/History screen
// uses, but for a HOD caller the backend auto-scopes to their own
// department (via the HoD's own faculty row's department_id - see
// AppraisalService.findAll) - no department_id param to pass here.

export async function listAppraisalRequestsForReview(status?: AppraisalStatus): Promise<MyAppraisalRequest[]> {
  const { data } = await apiClient.get<{ data: { data: RawAppraisalRequest[] } }>("/me/appraisal_requests", {
    params: { limit: 100, status },
  });
  return data.data.data.map(normalizeRequest);
}

// HoD's only two moves on a 'submitted' request: forward it to HR
// ('hod_reviewed') or send it back ('rejected') - there is no "send back to
// faculty for edits" status in appraisal_status_enum, rejected is terminal.
export async function reviewAppraisalRequest(
  id: number,
  decision: "hod_reviewed" | "rejected",
): Promise<MyAppraisalRequest> {
  const { data } = await apiClient.patch<{ data: RawAppraisalRequest }>(`/me/appraisal_requests/${id}`, {
    status: decision,
  });
  return normalizeRequest(data.data);
}
