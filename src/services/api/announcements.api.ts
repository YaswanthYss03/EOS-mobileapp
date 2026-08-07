import { apiClient } from "./client";

// Mirrors EOS-backend's announcements endpoints (see
// EOS-backend/src/modules/announcements/announcements/announcements.service.ts).
//
// Two independent, mutually-exclusive recipient shapes on the backend:
//  - "students": class_ids -> announcement_class_mapping rows (Faculty/HOD/Admin).
//  - "teachers": department_id -> a department-wide faculty broadcast, using
//    the announcements.department_id column (HOD is restricted to their own
//    department; see resolveTeacherTargetDepartment in the backend service).
// A single announcement can only carry one of the two - publishing "to
// classes and to a faculty department" from the compose screen sends two
// separate announcements with the same title/content.
//
// Drafts (status: "draft") are real, server-persisted, and visible only to
// their own author (see buildVisibilityQuery) - but a draft can only ever
// remember a class-targeted selection (class_ids), never a department
// target, since one announcement row can't carry both shapes at once. The
// "Target faculty" section is picked fresh at publish time instead.

export type AnnouncementClass = {
  id: number;
  label: string;
};

export type AnnouncementFacultyTarget = {
  id: number;
  label: string;
};

export type AnnouncementStatus = "draft" | "published";

export type Announcement = {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus;
  target_audience: "students" | "teachers" | "parents";
  class_ids: number[];
  department_id: number | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export type AttachmentUpload = {
  file_key: string;
  file_name: string;
  url: string;
};

export async function getMyAssignedClasses(): Promise<AnnouncementClass[]> {
  const { data } = await apiClient.get<{ data: AnnouncementClass[] }>(
    "/announcements/lookup/assigned-classes",
  );
  return data.data;
}

// HOD only - their own department, single-item array (an HOD may only ever
// broadcast to their own department's faculty).
export async function getMyDepartmentFacultyTarget(): Promise<AnnouncementFacultyTarget[]> {
  const { data } = await apiClient.get<{ data: AnnouncementFacultyTarget[] }>(
    "/announcements/lookup/my-department",
  );
  return data.data;
}

/** POST /announcements/attachments - uploads to Supabase Storage, returns the public URL + key. */
export async function uploadAnnouncementAttachment(file: {
  uri: string;
  name: string;
  mimeType: string;
}): Promise<AttachmentUpload> {
  const formData = new FormData();
  // React Native's FormData accepts { uri, name, type } for a file part -
  // this isn't a real Blob/File, so the usual DOM FormData typings don't
  // apply here.
  formData.append(
    "file",
    { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob,
  );

  const { data } = await apiClient.post<{ data: AttachmentUpload }>(
    "/announcements/attachments",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

type Attachment = { fileKey?: string; fileName?: string };

export async function publishAnnouncementToClasses(
  title: string,
  content: string,
  classIds: number[],
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.post<{ data: Announcement }>("/announcements", {
    title,
    content,
    status: "published",
    target_audience: "students",
    class_ids: classIds,
    file_key: attachment?.fileKey,
    file_name: attachment?.fileName,
  });
  return data.data;
}

export async function publishAnnouncementToDepartmentFaculty(
  title: string,
  content: string,
  departmentId: number,
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.post<{ data: Announcement }>("/announcements", {
    title,
    content,
    status: "published",
    target_audience: "teachers",
    department_id: departmentId,
    file_key: attachment?.fileKey,
    file_name: attachment?.fileName,
  });
  return data.data;
}

/** POST /announcements with status "draft" - a new draft, class_ids optional. */
export async function createAnnouncementDraft(
  title: string,
  content: string,
  classIds: number[],
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.post<{ data: Announcement }>("/announcements", {
    title,
    content,
    status: "draft",
    class_ids: classIds.length > 0 ? classIds : undefined,
    file_key: attachment?.fileKey,
    file_name: attachment?.fileName,
  });
  return data.data;
}

/** PATCH /announcements/:id - re-saves an existing draft, still a draft. */
export async function updateAnnouncementDraft(
  id: number,
  title: string,
  content: string,
  classIds: number[],
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.patch<{ data: Announcement }>(`/announcements/${id}`, {
    title,
    content,
    class_ids: classIds.length > 0 ? classIds : undefined,
    file_key: attachment?.fileKey,
    file_name: attachment?.fileName,
  });
  return data.data;
}

/** PATCH /announcements/:id - publishes a saved draft to classes. */
export async function publishDraftToClasses(
  id: number,
  title: string,
  content: string,
  classIds: number[],
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.patch<{ data: Announcement }>(`/announcements/${id}`, {
    title,
    content,
    status: "published",
    target_audience: "students",
    class_ids: classIds,
    file_key: attachment?.fileKey,
    file_name: attachment?.fileName,
  });
  return data.data;
}

/** GET /announcements?status=draft - own drafts only (enforced server-side). */
export async function getMyDraftAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<{ data: Announcement[] }>("/announcements", {
    params: { status: "draft" },
  });
  return data.data;
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await apiClient.delete(`/announcements/${id}`);
}
