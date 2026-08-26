import { apiClient } from "./client";

// Mirrors EOSbackend1's src/modules/achievements module - the Home tab's
// feed of official college achievement posts (photo/video + caption),
// backed by department_achievements/achievement_media/achievement_comments.
// Posting is Media Room only; every other role (student/faculty/hod/
// parent/HR/...) can only read and comment - see AchievementsController's
// own doc comment for why there's no role restriction on comments.

export type AchievementMediaType = "photo" | "video";

export type AchievementMedia = {
  id: number;
  achievement_id: number;
  media_type: AchievementMediaType;
  media_url: string;
  thumbnail_url: string | null;
  sequence_no: number;
};

// null only if the commenting account was deleted after commenting (the
// user row resolveCommenterDisplays looked up no longer exists) - never
// null for a live comment from a live account.
export type Commenter = {
  name: string;
  department: string;
} | null;

export type AchievementComment = {
  id: number;
  achievement_id: number;
  commented_by_user_id: number;
  comment_text: string;
  created_at: string;
  commenter: Commenter;
};

export type AchievementListItem = {
  id: number;
  department_id: number;
  posted_by_user_id: number;
  title: string;
  description: string | null;
  achievement_date: string | null;
  created_at: string;
  departments: { id: number; name: string };
  achievement_media: AchievementMedia[];
  _count: { achievement_comments: number };
};

export type AchievementDetail = Omit<AchievementListItem, "_count"> & {
  achievement_comments: AchievementComment[];
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export async function getAchievements(page = 1, limit = 20): Promise<PaginatedResponse<AchievementListItem>> {
  const { data } = await apiClient.get<{ data: PaginatedResponse<AchievementListItem> }>(
    "/department-achievements",
    { params: { page, limit } },
  );
  return data.data;
}

export async function getAchievement(id: number): Promise<AchievementDetail> {
  const { data } = await apiClient.get<{ data: AchievementDetail }>(`/department-achievements/${id}`);
  return data.data;
}

export async function addAchievementComment(
  achievementId: number,
  commentText: string,
): Promise<AchievementComment> {
  const { data } = await apiClient.post<{ data: AchievementComment }>(
    `/department-achievements/${achievementId}/comments`,
    { comment_text: commentText },
  );
  return data.data;
}

export async function removeAchievementComment(achievementId: number, commentId: number): Promise<void> {
  await apiClient.delete(`/department-achievements/${achievementId}/comments/${commentId}`);
}
