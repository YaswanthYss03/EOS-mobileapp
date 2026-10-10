import { apiClient } from "./client";

// Mirrors EOS-backend's /online-classes/* routes (see
// EOS-backend/src/modules/online-class/online-class.service.ts) - real
// LiveKit-backed video sessions. serverUrl/token are per-participant and
// short-lived; LIVEKIT_API_SECRET never reaches the client.

export type OnlineClassStatus = "scheduled" | "live" | "completed";

export type OnlineClass = {
  id: number;
  subject_id: number;
  class_id: number;
  faculty_id: number;
  class_date: string;
  period_number: number | null;
  status: OnlineClassStatus;
  livekit_room_name: string;
  scheduled_at: string | null;
  title: string | null;
  started_at: string | null;
  ended_at: string | null;
  // Present on GET /online-classes/today for students - lets them see
  // online classes that aren't on their timetable.
  subject_name?: string;
  faculty_name?: string;
};

export type LiveKitJoinInfo = {
  onlineClassId: number;
  roomName: string;
  serverUrl: string;
  token: string;
  // Server-clock start of the meeting and the server's "now" - the in-call
  // timer counts from startedAt so it never restarts on leave/rejoin.
  startedAt: string | null;
  serverTime: string;
};

export async function getTodayOnlineClasses(): Promise<OnlineClass[]> {
  const { data } = await apiClient.get<{ data: OnlineClass[] }>("/online-classes/today");
  return data.data;
}

/** Faculty/HoD only. */
export async function startOnlineClass(subjectId: number, classId: number): Promise<LiveKitJoinInfo> {
  const { data } = await apiClient.post<{ data: LiveKitJoinInfo }>("/online-classes/start", {
    subject_id: subjectId,
    class_id: classId,
  });
  return data.data;
}

/** Faculty/HoD only - start (or rejoin) one specific meeting by id, e.g. from the scheduled list. */
export async function startOnlineClassById(onlineClassId: number): Promise<LiveKitJoinInfo> {
  const { data } = await apiClient.post<{ data: LiveKitJoinInfo }>(`/online-classes/${onlineClassId}/start`);
  return data.data;
}

/** Mirrors the backend's MAX_CLASSES_PER_MEETING. */
export const MAX_CLASSES_PER_MEETING = 10;

/**
 * Faculty/HoD only - creates a future session shared with one or more of
 * the caller's classes (same subject). No LiveKit token yet (see
 * startOnlineClassById for that).
 */
export async function scheduleOnlineClass(input: {
  subjectId: number;
  classIds: number[];
  scheduledAt: string;
  title?: string;
}): Promise<OnlineClass> {
  const { data } = await apiClient.post<{ data: OnlineClass }>("/online-classes/schedule", {
    subject_id: input.subjectId,
    class_ids: input.classIds,
    scheduled_at: input.scheduledAt,
    title: input.title,
  });
  return data.data;
}

export type MyMeeting = {
  id: number;
  subject_id: number;
  subject_name: string;
  title: string | null;
  status: "scheduled" | "live";
  class_date: string;
  scheduled_at: string | null;
  started_at: string | null;
  is_today: boolean;
  classes: { online_class_id: number; class_id: number; section: string }[];
};

/** Faculty/HoD only - own upcoming and live meetings, one entry per (possibly multi-class) meeting. */
export async function getMyMeetings(): Promise<MyMeeting[]> {
  const { data } = await apiClient.get<{ data: MyMeeting[] }>("/online-classes/meetings");
  return data.data;
}

export type RecordingSubject = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  // null when that folder couldn't be counted right now.
  recording_count: number | null;
};

/** Faculty/HoD only - subjects the caller teaches, as recording folders. */
export async function getRecordingSubjects(): Promise<{ recordings_enabled: boolean; subjects: RecordingSubject[] }> {
  const { data } = await apiClient.get<{ data: { recordings_enabled: boolean; subjects: RecordingSubject[] } }>(
    "/online-classes/recordings/subjects",
  );
  return data.data;
}

export type ClassRecording = {
  file: string;
  title: string;
  sections: string[];
  recorded_at: string;
  size_bytes: number | null;
};

/** Faculty/HoD only - one subject's recordings, newest first. */
export async function getSubjectRecordings(
  subjectId: number,
): Promise<{ subject_id: number; subject_name: string; recordings: ClassRecording[] }> {
  const { data } = await apiClient.get<{
    data: { subject_id: number; subject_name: string; recordings: ClassRecording[] };
  }>("/online-classes/recordings", { params: { subject_id: subjectId } });
  return data.data;
}

/** Faculty/HoD only - short-lived signed URL to stream one recording. */
export async function getRecordingPlaybackUrl(subjectId: number, file: string): Promise<string> {
  const { data } = await apiClient.get<{ data: { url: string } }>("/online-classes/recordings/play", {
    params: { subject_id: subjectId, file },
  });
  return data.data.url;
}

/** Faculty/HoD only - the caller's own upcoming (not yet started) scheduled sessions. */
export async function getMyScheduledClasses(): Promise<OnlineClass[]> {
  const { data } = await apiClient.get<{ data: OnlineClass[] }>("/online-classes/scheduled");
  return data.data;
}

export async function joinOnlineClass(onlineClassId: number): Promise<LiveKitJoinInfo> {
  const { data } = await apiClient.post<{ data: LiveKitJoinInfo }>(`/online-classes/${onlineClassId}/join`);
  return data.data;
}

export async function leaveOnlineClass(onlineClassId: number): Promise<void> {
  await apiClient.post(`/online-classes/${onlineClassId}/leave`);
}

/** Faculty/HoD only, own class. */
export async function endOnlineClass(onlineClassId: number): Promise<void> {
  await apiClient.post(`/online-classes/${onlineClassId}/end`);
}

/** Host only - mute one participant's microphone. */
export async function muteMeetingParticipant(onlineClassId: number, identity: string): Promise<void> {
  await apiClient.post(`/online-classes/${onlineClassId}/participants/${encodeURIComponent(identity)}/mute`);
}

/** Host only - mute every student's microphone. */
export async function muteAllMeetingStudents(onlineClassId: number): Promise<{ muted: number }> {
  const { data } = await apiClient.post<{ data: { muted: number } }>(
    `/online-classes/${onlineClassId}/participants/mute-all`,
  );
  return data.data;
}

/** Host only - remove a student from the meeting. */
export async function removeMeetingParticipant(onlineClassId: number, identity: string): Promise<void> {
  await apiClient.post(`/online-classes/${onlineClassId}/participants/${encodeURIComponent(identity)}/remove`);
}
