import { apiClient } from "./client";

// Principal-only alumni group browsing - see EOS-backend's
// src/modules/alumni/admin-alumni-batches.service.ts and
// admin-alumni-groups.service.ts. Every alumni_batches row is one
// graduated batch's group (created by the graduation cron/admin trigger,
// see AlumniGraduationService) - Principal browses any of them, unlike a
// real alumnus (self-service /me/alumni/*) who only ever sees their own.

export type AlumniLatestActivity = {
  type: "message" | "join";
  text: string;
  at: string;
};

export type AlumniBatchSummary = {
  id: number;
  batch_id: number;
  group_name: string;
  // Real batch year-range (e.g. "2022-2026"), derived from batches.name -
  // shown as the group's title instead of group_name, which can span
  // multiple departments (e.g. "CSE / AIDS / ECE - Batch of 2026").
  batch_label: string;
  graduated_on: string;
  created_at: string;
  batches: { id: number; name: string };
  member_count: number;
  latest_activity: AlumniLatestActivity | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function listAlumniBatches(): Promise<AlumniBatchSummary[]> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<AlumniBatchSummary> }>(
    "/admin/alumni-batches",
    { params: { limit: 100 } },
  );
  return data.data.data;
}

export type AlumniGroupDetail = {
  id: number;
  batch_id: number;
  batch_name: string;
  batch_label: string;
  group_name: string;
  graduated_on: string;
  member_count: number;
};

export async function getAlumniGroupDetail(alumniBatchId: number): Promise<AlumniGroupDetail> {
  const { data } = await apiClient.get<{ data: AlumniGroupDetail }>(
    `/admin/alumni-batches/${alumniBatchId}`,
  );
  return data.data;
}

// A "join" entry is never a stored row - it's synthesized server-side from
// real alumni_members.joined_at rows, grouped by calendar day (see
// AdminAlumniGroupsService.listTimeline). A "message" entry is a real
// alumni_group_messages row.
export type AlumniTimelineItem =
  | {
      kind: "message";
      id: number;
      content: string;
      attachment_url: string | null;
      posted_by_name: string;
      at: string;
    }
  | { kind: "join"; id: string; text: string; at: string };

export async function getAlumniTimeline(alumniBatchId: number): Promise<AlumniTimelineItem[]> {
  const { data } = await apiClient.get<{ data: AlumniTimelineItem[] }>(
    `/admin/alumni-batches/${alumniBatchId}/timeline`,
  );
  return data.data;
}

/** Posts as the caller (posted_by_user_id) - never as an alumnus the caller isn't. */
export async function postAlumniMessage(alumniBatchId: number, content: string): Promise<void> {
  await apiClient.post(`/admin/alumni-batches/${alumniBatchId}/messages`, { content });
}
