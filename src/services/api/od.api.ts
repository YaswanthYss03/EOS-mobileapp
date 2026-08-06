import { apiClient } from "./client";

// Mirrors EOS-backend's on-duty module (see
// EOSbackend1/src/modules/admissions/students/me-profile/me-od-teams*.ts and
// me-od-requests*.ts). "reason" is the apply form's "Event" field - kept as
// `reason` here to match the wire format; only the mobile UI's own label
// differs. faculty_guide_id/name is the event's guide (picked from
// @/services/api/faculty.api.ts's directory), distinct from the student's
// standing class mentor (students.mentor_faculty_id) who actually gates
// mentor_approval_status.

export type OdTeamMember = {
  student_id: number;
  name: string;
  is_creator: boolean;
  joined_at: string;
};

export type OdTeam = {
  id: number;
  unique_code: string;
  is_locked: boolean;
  is_creator: boolean;
  member_count: number;
  members: OdTeamMember[];
  joined_at: string;
  created_at: string;
  has_request: boolean;
  od_request_id: number | null;
};

export type OdRequestSummary = {
  id: number;
  team_id: number;
  unique_code: string;
  from_date: string;
  to_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string | null;
  faculty_guide_name: string | null;
  mentor_approval_status: string;
  overall_status: "pending_mentor" | "pending_hod" | "approved" | "rejected";
  member_count: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  created_at: string;
};

export async function getMyOdTeams(): Promise<OdTeam[]> {
  const { data } = await apiClient.get<{ data: { data: OdTeam[] } }>("/me/od-teams");
  return data.data.data;
}

export async function createOdTeam(): Promise<OdTeam> {
  const { data } = await apiClient.post<{
    data: { id: number; unique_code: string; is_locked: boolean; created_at: string };
  }>("/me/od-teams", {});
  // The create response doesn't echo a member list (nothing to enrich - the
  // creator is the only member so far); synthesize the one entry the client
  // already knows rather than round-tripping to GET /me/od-teams just to
  // display it. A subsequent teamsReloadToken refetch (on join, etc.) will
  // replace this with the real server-resolved name.
  return {
    id: data.data.id,
    unique_code: data.data.unique_code,
    is_locked: data.data.is_locked,
    is_creator: true,
    member_count: 1,
    members: [{ student_id: -1, name: "You", is_creator: true, joined_at: data.data.created_at }],
    joined_at: data.data.created_at,
    created_at: data.data.created_at,
    has_request: false,
    od_request_id: null,
  };
}

export async function joinOdTeam(uniqueCode: string): Promise<void> {
  await apiClient.post("/me/od-teams/join", { unique_code: uniqueCode });
}

export async function submitOdRequest(
  teamId: number,
  payload: {
    from_date: string;
    to_date: string;
    reason: string;
    from_time?: string;
    to_time?: string;
    faculty_guide_id?: number;
  },
): Promise<void> {
  await apiClient.post(`/me/od-teams/${teamId}/requests`, payload);
}

export async function getMyOdRequests(
  page = 1,
  pageSize = 20,
): Promise<{ data: OdRequestSummary[]; total: number }> {
  const { data } = await apiClient.get<{ data: { data: OdRequestSummary[]; total: number } }>(
    "/me/od-requests",
    { params: { page, page_size: pageSize } },
  );
  return data.data;
}
