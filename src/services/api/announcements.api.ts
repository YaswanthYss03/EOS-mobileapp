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

// Principal (or Admin) only - one row per backend role, for the "Target
// roles" checkbox grid. "Broadcast to everyone" is just selecting every row
// here, not a distinct target_audience value - see
// EOS-backend/src/modules/announcements/announcements/announcements.service.ts
// lookupRoles().
export type AnnouncementRole = {
  id: number;
  name: string;
  description: string | null;
};

export type AnnouncementStatus = "draft" | "published";

export type AnnouncementCategory = "academic" | "department" | "emergency" | "event" | "general";

/**
 * Extra fields a post published through the Media Room's social publishing
 * screen carries. Absent (not an empty object) on an ordinary announcement,
 * so the two can be told apart - see toResponseShape in the backend service.
 */
export type SocialPostDetails = {
  /** Real stored values are "text" | "link" | "image" - do not assume the web constant list. */
  format: string | null;
  link_url: string | null;
  expires_at: string | null;
  is_pinned: boolean;
  allow_comments: boolean;
};

export type AnnouncementAuthor = {
  /** faculty -> non_teaching_staff -> email, resolved server-side. */
  name: string;
  role: string;
  designation: string | null;
  department: string | null;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  status: AnnouncementStatus;
  target_audience: "students" | "teachers" | "parents" | "roles";
  class_ids: number[];
  role_ids: number[];
  department_id: number | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
  category: AnnouncementCategory | null;
  /** When this was scheduled to publish; the backend cron flips it live at this time. */
  scheduled_at: string | null;
  /** Only present on the read endpoints (findAll/findOne), which include the poster relation. */
  posted_by?: AnnouncementAuthor;
  social?: SocialPostDetails;
  /** Ordered carousel items. Empty/absent on a post with no media. */
  media?: AnnouncementMedia[];
};

export type AttachmentUpload = {
  file_key: string;
  file_name: string;
  url: string;
};

/**
 * GET /announcements (no status param) - every "published" announcement
 * actually visible to the caller's own role/class/department, already
 * fully self-scoped server-side (see AnnouncementsService.
 * buildVisibilityQuery) - this is the read side used by the Home tab's
 * Announcements carousel/"View All" list, as opposed to every other
 * function in this file, which backs the ERP compose/manage screen.
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<{ data: Announcement[] }>("/announcements");
  return data.data;
}

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

/** GET /announcements/lookup/roles - Principal/Admin only. */
export async function getAnnouncementRoles(): Promise<AnnouncementRole[]> {
  const { data } = await apiClient.get<{ data: AnnouncementRole[] }>(
    "/announcements/lookup/roles",
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

// Principal (or Admin) only - target_audience: 'roles', persisted via
// announcement_role_mapping. "Broadcast to everyone" is just passing every
// id from getAnnouncementRoles(), not a distinct call.
export async function publishAnnouncementToRoles(
  title: string,
  content: string,
  roleIds: number[],
  attachment?: Attachment,
): Promise<Announcement> {
  const { data } = await apiClient.post<{ data: Announcement }>("/announcements", {
    title,
    content,
    status: "published",
    target_audience: "roles",
    role_ids: roleIds,
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

// ── Comments on a published post ────────────────────────────────────────────
//
// Backed by announcement_comments via
// GET/POST/DELETE /announcements/:id/comments. The Home feed uses these so a
// Media Room social post behaves like a post rather than a read-only notice.
// Whether commenting is offered at all is the post's own
// social.allow_comments flag, which the publishing screen sets.

export type AnnouncementComment = {
  id: number;
  announcement_id: number;
  commented_by_user_id: number;
  comment_text: string;
  parent_comment_id: number | null;
  created_at: string;
  /** faculty -> non_teaching_staff -> email, resolved server-side. */
  commenter_name: string | null;
};

/** GET /announcements/:id/comments */
export async function getAnnouncementComments(
  announcementId: number,
): Promise<AnnouncementComment[]> {
  const { data } = await apiClient.get<{ data: AnnouncementComment[] }>(
    `/announcements/${announcementId}/comments`,
  );
  return data.data;
}

/** POST /announcements/:id/comments */
export async function addAnnouncementComment(
  announcementId: number,
  commentText: string,
): Promise<AnnouncementComment> {
  const { data } = await apiClient.post<{ data: AnnouncementComment }>(
    `/announcements/${announcementId}/comments`,
    { comment_text: commentText },
  );
  return data.data;
}

// ── Carousel media on a social post ─────────────────────────────────────────
//
// Backed by announcement_media. Several photos/videos per post, ordered by
// sequence_no, shown as a swipeable carousel.

export type AnnouncementMediaType = "photo" | "video";

export type AnnouncementMedia = {
  id: number;
  media_type: AnnouncementMediaType;
  /** Derived server-side from the storage key on every read, so it never expires. */
  url: string;
  /** Poster frame, videos only. */
  thumbnail_url: string | null;
  /**
   * Intrinsic pixel size, captured at upload. Used to reserve the correct
   * aspect ratio BEFORE the file downloads, so the feed does not jump as each
   * photo loads. Null on older posts uploaded before dimensions were recorded -
   * those fall back to measuring on load.
   */
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  sequence_no: number;
};
