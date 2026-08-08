import { apiClient } from "./client";

// Mirrors EOS-backend's /me/lms/* routes (see
// EOS-backend/src/modules/lms/lms.service.ts). Google Classroom/Drive-style:
// Material = folders shared to one or more classes, each holding files or
// links; Task = assignments/quizzes with due dates, marks, and file
// submission; Lesson Plan = a per-session list a faculty checks off as the
// term progresses. Every value here is real - no fixed/mock catalogue.

export type LmsSubject = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
};

export type LmsTeachingSubject = LmsSubject & {
  classes: { class_id: number; label: string }[];
};

export type LmsFolder = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
  resource_count: number;
};

export type LmsStudentFolder = LmsFolder & { faculty_name: string };
export type LmsFacultyFolder = LmsFolder & { classes: { class_id: number; label: string }[] };

export type LmsResourceType = "file" | "link";

export type LmsResource = {
  id: number;
  title: string;
  description: string | null;
  resource_type: LmsResourceType;
  file_url: string | null;
  link_url: string | null;
  created_at: string;
};

export type LmsTaskType = "assignment" | "quiz";

export type LmsStudentTask = {
  id: number;
  title: string | null;
  description: string | null;
  due_date: string | null;
  max_marks: number | null;
  task_type: LmsTaskType;
  attachment_url: string | null;
  is_submitted: boolean;
  submission_file_url: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
};

export type LmsFacultyTask = {
  id: number;
  title: string | null;
  description: string | null;
  due_date: string | null;
  max_marks: number | null;
  task_type: LmsTaskType;
  class_label: string;
  submitted_count: number;
};

export type LmsSubmission = {
  student_id: number;
  student_id_no: string;
  name: string;
  status_id: number | null;
  is_submitted: boolean;
  submission_file_url: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
};

export type LmsLessonSession = {
  id: number;
  session_date: string;
  unit_title: string | null;
  topic: string;
  is_covered: boolean;
};

export type LmsLessonPlan = {
  sessions: LmsLessonSession[];
};

// --- Student ---

export async function getMyLmsSubjects(): Promise<LmsSubject[]> {
  const { data } = await apiClient.get<{ data: LmsSubject[] }>("/me/lms/subjects");
  return data.data;
}

export async function getStudentFolders(subjectId: number): Promise<LmsStudentFolder[]> {
  const { data } = await apiClient.get<{ data: LmsStudentFolder[] }>(`/me/lms/subjects/${subjectId}/folders`);
  return data.data;
}

export async function getStudentTasks(subjectId: number): Promise<LmsStudentTask[]> {
  const { data } = await apiClient.get<{ data: LmsStudentTask[] }>(`/me/lms/subjects/${subjectId}/tasks`);
  return data.data;
}

export async function getStudentLessonPlan(subjectId: number): Promise<LmsLessonPlan> {
  const { data } = await apiClient.get<{ data: LmsLessonPlan }>(`/me/lms/subjects/${subjectId}/lesson-plan`);
  return data.data;
}

export async function submitLmsTask(
  taskId: number,
  file: { uri: string; name: string; mimeType: string },
): Promise<{ submission_file_url: string }> {
  const formData = new FormData();
  formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { submission_file_url: string } }>(
    `/me/lms/tasks/${taskId}/submit`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

// --- Shared ---

export async function getFolderResources(folderId: number): Promise<LmsResource[]> {
  const { data } = await apiClient.get<{ data: LmsResource[] }>(`/me/lms/folders/${folderId}/resources`);
  return data.data;
}

// --- Faculty / HoD ---

export async function getMyTeachingSubjects(): Promise<LmsTeachingSubject[]> {
  const { data } = await apiClient.get<{ data: LmsTeachingSubject[] }>("/me/lms/my-subjects");
  return data.data;
}

export async function getFacultyFolders(subjectId: number): Promise<LmsFacultyFolder[]> {
  const { data } = await apiClient.get<{ data: LmsFacultyFolder[] }>(`/me/lms/my-subjects/${subjectId}/folders`);
  return data.data;
}

export async function createFolder(input: {
  subject_id: number;
  title: string;
  description?: string;
  class_ids: number[];
}): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>("/me/lms/folders", input);
  return data.data;
}

export async function updateFolder(
  id: number,
  input: { title?: string; description?: string; class_ids?: number[] },
): Promise<void> {
  await apiClient.patch(`/me/lms/folders/${id}`, input);
}

export async function deleteFolder(id: number): Promise<void> {
  await apiClient.delete(`/me/lms/folders/${id}`);
}

export async function addFileResource(
  folderId: number,
  title: string,
  description: string | undefined,
  file: { uri: string; name: string; mimeType: string },
): Promise<{ id: number; file_url: string }> {
  const formData = new FormData();
  formData.append("title", title);
  if (description) formData.append("description", description);
  formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { id: number; file_url: string } }>(
    `/me/lms/folders/${folderId}/resources/file`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function addLinkResource(
  folderId: number,
  input: { title: string; description?: string; link_url: string },
): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>(
    `/me/lms/folders/${folderId}/resources/link`,
    input,
  );
  return data.data;
}

export async function deleteResource(id: number): Promise<void> {
  await apiClient.delete(`/me/lms/resources/${id}`);
}

export async function getFacultyTasks(subjectId: number, classId?: number): Promise<LmsFacultyTask[]> {
  const { data } = await apiClient.get<{ data: LmsFacultyTask[] }>(`/me/lms/my-subjects/${subjectId}/tasks`, {
    params: classId ? { class_id: classId } : undefined,
  });
  return data.data;
}

export async function createTask(input: {
  subject_id: number;
  class_ids: number[];
  title: string;
  description?: string;
  due_date?: string;
  max_marks?: number;
  task_type: LmsTaskType;
}): Promise<{ ids: number[] }> {
  const { data } = await apiClient.post<{ data: { ids: number[] } }>("/me/lms/tasks", input);
  return data.data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/me/lms/tasks/${id}`);
}

export async function getTaskSubmissions(taskId: number): Promise<LmsSubmission[]> {
  const { data } = await apiClient.get<{ data: LmsSubmission[] }>(`/me/lms/tasks/${taskId}/submissions`);
  return data.data;
}

export async function gradeSubmission(statusId: number, marksObtained: number): Promise<void> {
  await apiClient.patch(`/me/lms/submissions/${statusId}`, { marks_obtained: marksObtained });
}

export async function getFacultyLessonPlan(subjectId: number, classId: number): Promise<LmsLessonPlan> {
  const { data } = await apiClient.get<{ data: LmsLessonPlan }>(
    `/me/lms/my-subjects/${subjectId}/lesson-plan`,
    { params: { class_id: classId } },
  );
  return data.data;
}

export async function createLessonSession(input: {
  subject_id: number;
  class_id: number;
  session_date: string;
  unit_title?: string;
  topic: string;
}): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>("/me/lms/lesson-plan/sessions", input);
  return data.data;
}

export async function updateLessonSession(
  id: number,
  input: { session_date?: string; unit_title?: string; topic?: string; is_covered?: boolean },
): Promise<void> {
  await apiClient.patch(`/me/lms/lesson-plan/sessions/${id}`, input);
}

export async function deleteLessonSession(id: number): Promise<void> {
  await apiClient.delete(`/me/lms/lesson-plan/sessions/${id}`);
}
