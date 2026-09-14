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
};

export type LiveKitJoinInfo = {
  onlineClassId: number;
  roomName: string;
  serverUrl: string;
  token: string;
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

/** Faculty/HoD only - creates a future session, no LiveKit token yet (see startOnlineClass for that). */
export async function scheduleOnlineClass(input: {
  subjectId: number;
  classId: number;
  scheduledAt: string;
  title?: string;
}): Promise<OnlineClass> {
  const { data } = await apiClient.post<{ data: OnlineClass }>("/online-classes/schedule", {
    subject_id: input.subjectId,
    class_id: input.classId,
    scheduled_at: input.scheduledAt,
    title: input.title,
  });
  return data.data;
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
